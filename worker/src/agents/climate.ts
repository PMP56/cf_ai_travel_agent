import { runStructured } from "../utils/structured";
import { getClimateNormals, ClimateNormals, ClimateFetchError } from "../tools/climate";
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
- caution: one sentence on the main weather risk, or "" if the month is genuinely benign.
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

  const normals = await getClimateNormals(
    place.latitude,
    place.longitude,
    brief.travelMonth,
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
    summary: typeof raw?.summary === "string" ? raw.summary.trim() : "",
    packing,
    caution: typeof raw?.caution === "string" && raw.caution.trim() ? raw.caution.trim() : null,
    comfortRating: rating,
  };
}
