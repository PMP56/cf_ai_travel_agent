import { runStructured } from "../utils/structured";
import { findNotablePlaces, radiusForPopulation, NotablePlace } from "../tools/places";
import { TripBrief } from "../schema/trip";
import { ResolvedPlace } from "../tools/geocode";

/**
 * Agent 3 — Places.
 *
 * Pageview ranking finds what is *notable* near a coordinate, but notable is
 * not the same as visitable: it also surfaces people (Anna Maria Luisa de'
 * Medici), events (Kenmu Restoration), artworks, administrative areas and
 * neighbouring towns. A blocklist cannot close that gap — the judgement is
 * open-ended, which is exactly what a model is for.
 *
 * The model selects BY INDEX from the real candidate list and never emits a
 * name or a coordinate. Every field the UI plots comes from the tool, so a
 * hallucinated place is structurally impossible: the worst failure mode is a
 * bad selection from real data, not an invented landmark.
 */

const CATEGORIES = [
  "landmark", "museum", "religious", "nature", "park", "market",
  "viewpoint", "neighbourhood", "entertainment", "historic",
] as const;

const SYSTEM = `You curate a shortlist of places worth visiting, choosing from a numbered list of real nearby locations.

Return ONLY indices from the list. Never invent a place.

KEEP a place if a traveller could go there and spend time: landmarks, temples, museums, parks, gardens, markets, viewpoints, notable neighbourhoods, castles, beaches.

REJECT, no matter how famous:
- people (an article about a person, not a place)
- events, battles, treaties, historical periods
- artworks and artefacts that are exhibits rather than destinations
- administrative areas: prefectures, regions, districts-as-government-units, municipalities
- separate towns and cities near the destination — the traveller is visiting ONE place
- infrastructure: airports, stations, stadiums, hospitals, shops, chain stores, office buildings
- anything you cannot confidently identify as a visitable location

For each place you keep:
- index: its number in the list
- category: exactly one of landmark, museum, religious, nature, park, market, viewpoint, neighbourhood, entertainment, historic
- why: ONE short clause on why THIS traveller would want it, given their stated interests. No full sentences, no restating the name.

Order by how strongly you recommend it. Keep at most 12. Quality over quantity — returning 6 excellent places beats 12 padded ones.`;

const PLACES_JSON_SCHEMA = {
  type: "object",
  properties: {
    keep: {
      type: "array",
      items: {
        type: "object",
        properties: {
          index: { type: "number" },
          category: { type: "string" },
          why: { type: "string" },
        },
        required: ["index", "category", "why"],
      },
    },
  },
  required: ["keep"],
} as const;

export interface CuratedPlace extends NotablePlace {
  category: string;
  why: string;
}

/** How many candidates to show the model. Caps input tokens. */
const CANDIDATE_LIMIT = 30;

function renderCandidates(candidates: NotablePlace[]): string {
  return candidates
    .map((c, i) => {
      const summary = c.summary.slice(0, 160);
      const km = (c.distanceM / 1000).toFixed(1);
      return `${i}. ${c.title} (${km}km) — ${summary}`;
    })
    .join("\n");
}

function describeTraveller(brief: TripBrief): string {
  const bits: string[] = [];
  if (brief.interests.length) bits.push(`Interests: ${brief.interests.join(", ")}.`);
  if (brief.constraints.length) bits.push(`Constraints: ${brief.constraints.join(", ")}.`);
  if (brief.pace) bits.push(`Pace: ${brief.pace}.`);
  if (brief.durationDays) bits.push(`Trip length: ${brief.durationDays} days.`);
  return bits.length ? bits.join(" ") : "No stated preferences.";
}

export async function runPlacesAgent(
  ai: Ai,
  brief: TripBrief,
  place: ResolvedPlace
): Promise<CuratedPlace[]> {
  const candidates = await findNotablePlaces(place.latitude, place.longitude, {
    limit: CANDIDATE_LIMIT,
    destinationName: place.name,
    radiusM: radiusForPopulation(place.population),
  });

  if (candidates.length === 0) return [];

  const raw = await runStructured(ai, {
    system: SYSTEM,
    user: [
      `Destination: ${place.name}, ${place.country}`,
      describeTraveller(brief),
      "",
      "Candidate locations:",
      renderCandidates(candidates),
    ].join("\n"),
    schema: PLACES_JSON_SCHEMA,
    context: "places",
    maxTokens: 1024,
  });

  const kept = Array.isArray(raw?.keep) ? raw.keep : [];
  const seen = new Set<number>();
  const curated: CuratedPlace[] = [];

  for (const item of kept) {
    const index = typeof item?.index === "number" ? Math.round(item.index) : -1;
    const candidate = candidates[index];

    // Out-of-range or repeated indices are the only way this can go wrong,
    // and both are silently dropped rather than trusted.
    if (!candidate || seen.has(index)) continue;
    seen.add(index);

    const category =
      typeof item?.category === "string" &&
      (CATEGORIES as readonly string[]).includes(item.category)
        ? item.category
        : "landmark";

    curated.push({
      ...candidate,
      category,
      why: typeof item?.why === "string" ? item.why.trim().slice(0, 140) : "",
    });
  }

  return curated;
}
