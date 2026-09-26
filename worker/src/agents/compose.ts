import { runStructured } from "../utils/structured";
import { TripBrief } from "../schema/trip";
import { ResolvedPlace } from "../tools/geocode";
import { CuratedPlace } from "./places";
import { ClimateGuidance } from "./climate";
import {
  clusterByDay,
  orderClusters,
  placesPerDay,
  haversineKm,
} from "../tools/cluster";

/**
 * Agent 7 — Composer.
 *
 * Which places share a day is geometry, so it is settled in code before the
 * model is involved (see tools/cluster.ts — 27% less travel than rank order on
 * a Kyoto itinerary). The model supplies what code cannot: a theme for each
 * day, the order to walk it in, and a note tying it to the weather and the
 * traveller's interests.
 *
 * The model's day assignments are NOT trusted. If it moves a place to another
 * day, the clustering stands and only its prose is kept — otherwise one stray
 * index quietly undoes the geography.
 */

const SYSTEM = `You write the day-by-day narrative for a travel itinerary.

The places for each day are already fixed — they were grouped by geography so the traveller is not criss-crossing the city. Do NOT move a place to a different day, and do not invent places.

For each day:
- title: 2-5 words naming the day by its AREA or THEME, e.g. "Eastern temples on foot" or "Arashiyama and the west". Never "Day 3" or "Sightseeing".
- order: the place indices for that day, reordered into the sequence to visit them. Consider opening rhythms — sunrise spots and popular sights early, viewpoints and nightlife late. Use exactly the indices given for that day, each once.
- note: ONE sentence of practical guidance specific to this day: how to get between these places, roughly how long it needs, or what the weather means for it. No filler, no restating the place names.

Be concrete. A traveller should be able to act on every note.`;

const COMPOSE_JSON_SCHEMA = {
  type: "object",
  properties: {
    days: {
      type: "array",
      items: {
        type: "object",
        properties: {
          day: { type: "number" },
          title: { type: "string" },
          order: { type: "array", items: { type: "number" } },
          note: { type: "string" },
        },
        required: ["day", "title", "order", "note"],
      },
    },
  },
  required: ["days"],
} as const;

export interface ItineraryDay {
  day: number;
  title: string;
  note: string;
  places: CuratedPlace[];
  /** Walking distance across the day's stops in order, km. */
  travelKm: number;
}

export interface Itinerary {
  days: ItineraryDay[];
  /** Trip days with nothing scheduled, because places ran out. */
  unscheduledDays: number;
  totalTravelKm: number;
}

function pathLengthKm(places: CuratedPlace[]): number {
  let total = 0;
  for (let i = 0; i < places.length - 1; i++) {
    total += haversineKm(places[i], places[i + 1]);
  }
  return Math.round(total * 10) / 10;
}

export async function runComposer(
  ai: Ai,
  brief: TripBrief,
  base: ResolvedPlace,
  places: CuratedPlace[],
  climate: ClimateGuidance | null
): Promise<Itinerary | null> {
  if (places.length === 0) return null;

  const perDay = placesPerDay(brief.pace);
  const tripDays = brief.durationDays ?? Math.ceil(places.length / perDay);
  const activeDays = Math.min(tripDays, Math.ceil(places.length / perDay));

  // Geometry first: this decides WHICH places share a day.
  const clusters = orderClusters(clusterByDay(places, activeDays), base);

  // Index into the flat list so the model can only ever name a real place.
  const indexOf = new Map<CuratedPlace, number>(places.map((p, i) => [p, i]));

  const dayBlocks = clusters
    .map((cluster, i) => {
      const lines = cluster.places
        .map((p) => `    [${indexOf.get(p)}] ${p.title} (${p.category}) — ${p.why}`)
        .join("\n");
      return `Day ${i + 1} (places within ${cluster.spreadKm}km of each other):\n${lines}`;
    })
    .join("\n\n");

  const context = [
    `Destination: ${base.name}, ${base.country}`,
    brief.travelMonth ? `Month: ${brief.travelMonth}` : "",
    brief.pace ? `Requested pace: ${brief.pace}` : "",
    brief.interests.length ? `Interests: ${brief.interests.join(", ")}` : "",
    climate
      ? `Weather: typically ${climate.normals.avgHighC}C / ${climate.normals.avgLowC}C` +
        (climate.caution ? `. ${climate.caution}` : "")
      : "",
  ]
    .filter(Boolean)
    .join("\n");

  const raw = await runStructured(ai, {
    system: SYSTEM,
    user: `${context}\n\n${dayBlocks}`,
    schema: COMPOSE_JSON_SCHEMA,
    context: "composer",
    maxTokens: 1200,
  });

  const narratives = new Map<number, { title: string; order: number[]; note: string }>();
  if (Array.isArray(raw?.days)) {
    for (const d of raw.days) {
      const dayNumber = typeof d?.day === "number" ? Math.round(d.day) : NaN;
      if (!Number.isFinite(dayNumber)) continue;
      narratives.set(dayNumber, {
        title: typeof d?.title === "string" ? d.title.trim().slice(0, 60) : "",
        order: Array.isArray(d?.order)
          ? d.order.filter((n: unknown): n is number => typeof n === "number")
          : [],
        note: typeof d?.note === "string" ? d.note.trim().slice(0, 220) : "",
      });
    }
  }

  const days: ItineraryDay[] = clusters.map((cluster, i) => {
    const dayNumber = i + 1;
    const narrative = narratives.get(dayNumber);
    const assigned = cluster.places;

    // Honour the model's ordering only if it is a permutation of THIS day's
    // places. Anything else — a moved place, a duplicate, a dropped stop —
    // and the geographic grouping stands.
    let ordered = assigned;
    if (narrative && narrative.order.length === assigned.length) {
      const candidate = narrative.order.map((idx) => places[idx]);
      const sameSet =
        candidate.every((p) => p && assigned.includes(p)) &&
        new Set(candidate).size === assigned.length;
      if (sameSet) ordered = candidate as CuratedPlace[];
    }

    return {
      day: dayNumber,
      title: narrative?.title || `${base.name} day ${dayNumber}`,
      note: narrative?.note ?? "",
      places: ordered,
      travelKm: pathLengthKm(ordered),
    };
  });

  return {
    days,
    unscheduledDays: Math.max(0, tripDays - days.length),
    totalTravelKm: Math.round(days.reduce((sum, d) => sum + d.travelKm, 0) * 10) / 10,
  };
}
