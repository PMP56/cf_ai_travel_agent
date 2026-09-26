import { runStructured } from "../utils/structured";
import { getClimateYear, ClimateNormals, ClimateYear, ClimateFetchError } from "../tools/climate";
import { TripBrief } from "../schema/trip";
import { ResolvedPlace } from "../tools/geocode";

/**
 * Agent 2 — Climate.
 *
 * The template for every grounded specialist in v2:
 *
 *   1. fetch real data in code (no model involved, no tool calling)
 *   2. hand the model ONLY that data
 *   3. constrain the answer with a JSON Schema
 *
 * The model never recalls what April is like in Kyoto — it reads measured ERA5
 * normals and interprets them. That is the whole difference between v1 and v2.
 */

const SYSTEM = `You are a travel climate advisor. You are given MEASURED climate data for a destination and month.

Interpret the numbers for a traveller. Never contradict them and never introduce figures of your own — every claim must follow from the data provided.

- summary: 1-2 sentences on what the weather will actually feel like.
- packing: 3-5 specific items justified by the data. Cite the reason ("evenings near 8C" not "it may be cool").
- caution: ONE COMPLETE SENTENCE naming the single most notable weather risk AND its figure, then what it means for the traveller.
  First decide whether ANY figure is actually notable, using these thresholds:
    high above 30C, or low below 5C
    rain on more than 40% of days
    average peak wind above 30km/h
  Pick the figure that exceeds its threshold by the widest margin. A number below its threshold is
  ordinary and must NOT be reported as a risk — 15km/h wind is a light breeze, not a hazard.
  If nothing crosses a threshold, return "" for this field.
  Good: "Average peak winds of 31km/h gusting to 60km/h will make exposed trails hard going, so plan ridge walks for calmer mornings."
  Bad: "sustained winds"
  Bad: "Winds of 15.5km/h will have a moderate impact on outdoor activities."
- comfortRating: integer 1-5 for sightseeing comfort. 5 = mild and dry, 1 = extreme heat, cold, or near-constant rain.`;

const CLIMATE_JSON_SCHEMA = {
  type: "object",
  properties: {
    summary: { type: "string" },
    packing: { type: "array", items: { type: "string" } },
    caution: { type: "string" },
    comfortRating: { type: "number" },
  },
  required: ["summary", "packing", "caution", "comfortRating"],
} as const;

export interface ClimateGuidance {
  normals: ClimateNormals;
  /**
   * Every month, not just the one asked for. The archive request already
   * returns five years of daily data, so all twelve are computed either way —
   * discarding eleven of them threw away the answer to the question travellers
   * actually ask, which is whether they picked the right month.
   */
  year: ClimateYear;
  summary: string;
  packing: string[];
  caution: string | null;
  comfortRating: number;
}

function describe(n: ClimateNormals, place: string): string {
  const rainyPct = Math.round(n.rainyDayFraction * 100);
  return [
    `Destination: ${place}`,
    `Month: ${n.month} (averaged over ${n.yearsSampled} years of measured data)`,
    `Average daily high: ${n.avgHighC}C`,
    `Average daily low: ${n.avgLowC}C`,
    `Record high in this month: ${n.recordHighC}C`,
    `Record low in this month: ${n.recordLowC}C`,
    `Average monthly rainfall: ${n.avgPrecipitationMm}mm`,
    `Share of days with meaningful rain (>1mm): ${rainyPct}%`,
    `Average daily peak wind: ${n.avgWindKph}km/h`,
    `Strongest wind recorded in this month: ${n.peakWindKph}km/h`,
  ].join("\n");
}

/**
 * Returns null when there is no month to reason about or the archive has no
 * data for this location. Callers plan without climate input rather than fail.
 */
export async function runClimateAgent(
  ai: Ai,
  brief: TripBrief,
  place: ResolvedPlace
): Promise<ClimateGuidance | null> {
  if (!brief.travelMonth) return null;

  const year = await getClimateYear(
    place.latitude,
    place.longitude,
    place.timezone
  ).catch((err) => {
    // A failed request is not the same as a location with no data. Both degrade
    // to "plan without climate", but only one of them is worth alerting on.
    if (err instanceof ClimateFetchError) {
      console.error(`Climate unavailable (${err.status ?? "network"}): ${err.message}`);
    } else {
      console.error("Climate agent error:", err);
    }
    return null;
  });

  if (!year) return null;

  const normals = year[brief.travelMonth];
  if (!normals) return null;

  const placeLabel = [place.name, place.country].filter(Boolean).join(", ");
  const raw = await runStructured(ai, {
    system: SYSTEM,
    user: describe(normals, placeLabel),
    schema: CLIMATE_JSON_SCHEMA,
    context: "climate",
    maxTokens: 512,
  });

  const rating = typeof raw?.comfortRating === "number"
    ? Math.min(5, Math.max(1, Math.round(raw.comfortRating)))
    : 3;

  const packing = Array.isArray(raw?.packing)
    ? raw.packing.filter((p: unknown): p is string => typeof p === "string" && p.trim().length > 0).slice(0, 6)
    : [];

  return {
    normals,
    year,
    summary: typeof raw?.summary === "string" ? raw.summary.trim() : "",
    packing,
    caution: typeof raw?.caution === "string" && raw.caution.trim() ? raw.caution.trim() : null,
    comfortRating: rating,
  };
}
