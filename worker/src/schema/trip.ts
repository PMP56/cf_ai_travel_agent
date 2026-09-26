/**
 * The TripBrief is v2's central object: the structured intent behind a request.
 * Every agent reads it; the UI renders it as editable chips; editing one field
 * re-runs only the agents that depend on it.
 */

export interface TripBrief {
  /** As the user said it — shown in the UI. May be a region: "Patagonia". */
  destination: string;
  /**
   * A specific city to anchor geocoding on. Geocoders are city-oriented, so
   * "Patagonia" alone resolves to Patagonia, Arizona. Null when `destination`
   * is already a city.
   */
  destinationCity: string | null;
  durationDays: number | null;
  travelMonth: string | null;
  budget: { amount: number; currency: string } | null;
  partySize: number | null;
  pace: TripPace | null;
  interests: string[];
  constraints: string[];
}

export type TripPace = "relaxed" | "moderate" | "packed";

const PACES: TripPace[] = ["relaxed", "moderate", "packed"];

export const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
] as const;

/**
 * The JSON Schema handed to Workers AI `response_format`.
 *
 * Deliberately FLAT with sentinel values instead of nulls or nested objects:
 * Cloudflare does not guarantee JSON Mode compliance and fails harder on
 * complex schemas, so unknowns come back as "" or 0 and are normalised below.
 */
export const TRIP_BRIEF_JSON_SCHEMA = {
  type: "object",
  properties: {
    destination: { type: "string" },
    destinationCity: { type: "string" },
    durationDays: { type: "number" },
    travelMonth: { type: "string" },
    budgetAmount: { type: "number" },
    budgetCurrency: { type: "string" },
    partySize: { type: "number" },
    pace: { type: "string" },
    interests: { type: "array", items: { type: "string" } },
    constraints: { type: "array", items: { type: "string" } },
  },
  required: [
    "destination", "destinationCity", "durationDays", "travelMonth", "budgetAmount",
    "budgetCurrency", "partySize", "pace", "interests", "constraints",
  ],
} as const;

/** The flat shape the model returns, before normalisation. */
interface RawTripBrief {
  destination: string;
  destinationCity: string;
  durationDays: number;
  travelMonth: string;
  budgetAmount: number;
  budgetCurrency: string;
  partySize: number;
  pace: string;
  interests: string[];
  constraints: string[];
}

function cleanStrings(value: unknown, limit: number): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((v): v is string => typeof v === "string" && v.trim().length > 0)
    .map((v) => v.trim())
    .slice(0, limit);
}

function titleCaseMonth(value: string): string | null {
  const match = MONTHS.find((m) => m.toLowerCase() === value.trim().toLowerCase());
  return match ?? null;
}

/** Turn the model's flat sentinel-laden output into a typed brief. */
export function normalizeTripBrief(raw: unknown): TripBrief {
  const r = raw as Partial<RawTripBrief>;

  if (typeof r?.destination !== "string" || !r.destination.trim()) {
    throw new Error("Intake produced no destination");
  }

  const duration = typeof r.durationDays === "number" && r.durationDays > 0
    ? Math.min(Math.round(r.durationDays), 60)
    : null;

  const amount = typeof r.budgetAmount === "number" && r.budgetAmount > 0
    ? Math.round(r.budgetAmount)
    : null;

  const party = typeof r.partySize === "number" && r.partySize > 0
    ? Math.min(Math.round(r.partySize), 20)
    : null;

  const pace = typeof r.pace === "string" && (PACES as string[]).includes(r.pace)
    ? (r.pace as TripPace)
    : null;

  const city = typeof r.destinationCity === "string" ? r.destinationCity.trim() : "";

  return {
    destination: r.destination.trim(),
    destinationCity: city && city.toLowerCase() !== r.destination.trim().toLowerCase() ? city : null,
    durationDays: duration,
    travelMonth: typeof r.travelMonth === "string" ? titleCaseMonth(r.travelMonth) : null,
    budget: amount ? { amount, currency: (r.budgetCurrency || "USD").trim().toUpperCase() } : null,
    partySize: party,
    pace,
    interests: cleanStrings(r.interests, 8),
    constraints: cleanStrings(r.constraints, 8),
  };
}

/** Which fields the UI should prompt for. Drives the "brief chips" panel. */
export function missingBriefFields(brief: TripBrief): string[] {
  const missing: string[] = [];
  if (!brief.durationDays) missing.push("durationDays");
  if (!brief.travelMonth) missing.push("travelMonth");
  if (!brief.budget) missing.push("budget");
  return missing;
}
