import { runStructured } from "../utils/structured";
import {
  TripBrief,
  TRIP_BRIEF_JSON_SCHEMA,
  normalizeTripBrief,
} from "../schema/trip";
import { geocodeDestination, ResolvedPlace } from "../tools/geocode";

/**
 * Agent 0 — Intake.
 *
 * Turns free text into a typed TripBrief and resolves the destination to real
 * coordinates. Everything downstream reads the brief, so this is the only place
 * that has to understand messy human phrasing.
 *
 * It extracts only what was actually said. Inventing a budget the user never
 * mentioned would silently constrain every later agent, so unknowns stay null
 * and surface in the UI as fields to fill.
 */

const SYSTEM = `You extract structured travel intent from a user's message.
Return only the fields defined by the schema.

Rules:
- Extract ONLY what the user actually stated or clearly implied. Never invent details.
- destination: the place as the user described it, e.g. "Patagonia" or "Kyoto".
- destinationCity: a specific, well-known CITY to anchor a map search on. If the user named a region, country, or natural area, give its main traveller gateway city ("Patagonia" -> "El Calafate", "Tuscany" -> "Florence", "Japan" -> "Tokyo"). If destination is already a city, repeat it here. Never leave this empty.
- durationDays: convert phrases to whole days ("a week" = 7, "long weekend" = 3, "2 weeks" = 14). Use 0 if unstated.
- travelMonth: a full English month name. Convert seasons using the NORTHERN hemisphere unless the destination is southern ("spring" = April, "summer" = July). Use "" if unstated.
- budgetAmount / budgetCurrency: the total trip budget as a number plus an ISO code ("$3000" = 3000 USD). Use 0 and "" if unstated.
- partySize: number of travellers ("for two" = 2, "solo" = 1). Use 0 if unstated.
- pace: exactly one of "relaxed", "moderate", "packed", or "" if unstated. "Packed" means the user wants to see as much as possible; "relaxed" means few activities per day.
- interests: short lowercase noun phrases the user expressed enthusiasm for, e.g. ["hiking", "temples", "street food"]. Empty array if none.
- constraints: hard limits or things to avoid, e.g. ["vegetarian", "no long hikes", "wheelchair accessible"]. Empty array if none.`;

export interface IntakeResult {
  brief: TripBrief;
  /** Best geocoding match, or null when the destination could not be resolved. */
  place: ResolvedPlace | null;
  /** Other plausible matches — the UI offers these when the name is ambiguous. */
  alternatives: ResolvedPlace[];
}

/** Two candidates are a real ambiguity only if neither clearly dominates. */
function isAmbiguous(candidates: ResolvedPlace[]): boolean {
  if (candidates.length < 2) return false;
  const [first, second] = candidates;
  const firstPop = first.population ?? 0;
  const secondPop = second.population ?? 0;
  if (firstPop === 0) return true;
  return secondPop / firstPop > 0.25;
}

export async function runIntake(ai: Ai, message: string): Promise<IntakeResult> {
  const raw = await runStructured(ai, {
    system: SYSTEM,
    user: message,
    schema: TRIP_BRIEF_JSON_SCHEMA,
    context: "intake",
    maxTokens: 512,
  });

  const brief = normalizeTripBrief(raw);

  // Geocode the anchor city, not the region: "Patagonia" alone resolves to
  // Patagonia, Arizona. Geocoding is enrichment — failure must not lose a brief.
  const searchTerm = brief.destinationCity ?? brief.destination;
  const candidates = await geocodeDestination(searchTerm).catch((err) => {
    console.error("Geocoding failed:", err);
    return [] as ResolvedPlace[];
  });

  return {
    brief,
    place: candidates[0] ?? null,
    alternatives: isAmbiguous(candidates) ? candidates.slice(1, 4) : [],
  };
}
