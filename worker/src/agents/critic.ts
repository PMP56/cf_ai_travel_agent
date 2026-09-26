import { runStructured } from "../utils/structured";
import { TripBrief } from "../schema/trip";
import { Itinerary } from "./compose";
import { ClimateGuidance } from "./climate";
import { placesPerDay } from "../tools/cluster";

/**
 * Agent 8 — Critic.
 *
 * Asks one question of a finished itinerary: would a competent human travel
 * agent sign this off?
 *
 * Two passes, split the same way as everywhere else. Arithmetic faults —
 * distance, density, duplicates, empty days — are found in code, because they
 * are facts and a model asked to check them will sometimes agree that 40km is
 * a pleasant stroll. The model is used only for judgement a calculation cannot
 * make: whether an entry is really a place, whether an order makes sense,
 * whether a note contradicts the weather.
 */

/** A day's walking beyond this is not a day out, it is a route march. */
const MAX_COMFORTABLE_DAY_KM = 12;
const MAX_STRENUOUS_DAY_KM = 20;

export type DefectSeverity = "blocking" | "warning";

export interface Defect {
  severity: DefectSeverity;
  day: number | null;
  issue: string;
}

export interface Critique {
  defects: Defect[];
  /** True when nothing blocking was found. */
  approved: boolean;
}

/** Facts, not opinions — these are computed, never asked. */
function mechanicalChecks(
  itinerary: Itinerary,
  brief: TripBrief,
  climate: ClimateGuidance | null
): Defect[] {
  const defects: Defect[] = [];
  const allowance = placesPerDay(brief.pace);

  for (const day of itinerary.days) {
    if (day.travelKm > MAX_STRENUOUS_DAY_KM) {
      defects.push({
        severity: "blocking",
        day: day.day,
        issue: `${day.travelKm}km between stops — not walkable in a day, and the stops are too far apart to be one itinerary.`,
      });
    } else if (day.travelKm > MAX_COMFORTABLE_DAY_KM) {
      defects.push({
        severity: "warning",
        day: day.day,
        issue: `${day.travelKm}km between stops; needs transit rather than walking.`,
      });
    }

    if (day.places.length > allowance + 1) {
      defects.push({
        severity: "warning",
        day: day.day,
        issue: `${day.places.length} stops on a ${brief.pace ?? "moderate"} day (expected about ${allowance}).`,
      });
    }

    if (day.places.length === 0) {
      defects.push({ severity: "blocking", day: day.day, issue: "Day has no places." });
    }
  }

  // A place scheduled twice is always a mistake.
  const seen = new Map<string, number>();
  for (const day of itinerary.days) {
    for (const place of day.places) {
      const first = seen.get(place.title);
      if (first !== undefined) {
        defects.push({
          severity: "blocking",
          day: day.day,
          issue: `${place.title} already appears on day ${first}.`,
        });
      } else {
        seen.set(place.title, day.day);
      }
    }
  }

  if (itinerary.unscheduledDays > 0) {
    defects.push({
      severity: "warning",
      day: null,
      issue: `${itinerary.unscheduledDays} of ${brief.durationDays} days have nothing scheduled — too few places were found for a trip this long.`,
    });
  }

  if (climate && climate.comfortRating <= 2) {
    defects.push({
      severity: "warning",
      day: null,
      issue: `Conditions in ${climate.normals.month} are hard for sightseeing (comfort ${climate.comfortRating}/5); the plan should lean indoors.`,
    });
  }

  return defects;
}

const SYSTEM = `You are a senior travel planner reviewing a junior's itinerary before it goes to a client. Be exacting; your job is to find what is wrong, not to praise.

Report ONLY these kinds of defect:
- an entry that is not somewhere a traveller can go: a historical era, an administrative area, a person, an event, a company
- a day whose order makes no practical sense, e.g. a sunrise spot scheduled last
- a note that contradicts the stated weather or the traveller's constraints
- a day whose theme does not match the places it contains

Do NOT report: distances, how many stops a day has, duplicates, or empty days. Those are checked separately and reporting them is noise.

If the itinerary has none of these problems, return an empty list. An empty list is a valid and common answer — do not invent a defect to seem useful.

For each defect: severity is "blocking" if it would embarrass the planner in front of the client, otherwise "warning". day is the day number, or 0 if it concerns the whole trip. issue is one specific sentence.`;

const CRITIC_JSON_SCHEMA = {
  type: "object",
  properties: {
    defects: {
      type: "array",
      items: {
        type: "object",
        properties: {
          severity: { type: "string" },
          day: { type: "number" },
          issue: { type: "string" },
        },
        required: ["severity", "day", "issue"],
      },
    },
  },
  required: ["defects"],
} as const;

function renderItinerary(itinerary: Itinerary, climate: ClimateGuidance | null): string {
  const weather = climate
    ? `Weather: typically ${climate.normals.avgHighC}C / ${climate.normals.avgLowC}C` +
      (climate.caution ? `. ${climate.caution}` : "")
    : "Weather: unknown";

  const days = itinerary.days
    .map((d) => {
      const stops = d.places
        .map((p) => `    - ${p.title} (${p.category})`)
        .join("\n");
      return `Day ${d.day}: ${d.title}\n${stops}\n    note: ${d.note || "(none)"}`;
    })
    .join("\n\n");

  return `${weather}\n\n${days}`;
}

export async function runCritic(
  ai: Ai,
  brief: TripBrief,
  itinerary: Itinerary,
  climate: ClimateGuidance | null
): Promise<Critique> {
  const mechanical = mechanicalChecks(itinerary, brief, climate);

  let judged: Defect[] = [];
  try {
    const constraints = brief.constraints.length
      ? `Traveller constraints: ${brief.constraints.join(", ")}.`
      : "";

    const raw = await runStructured(ai, {
      system: SYSTEM,
      user: `${constraints}\n${renderItinerary(itinerary, climate)}`,
      schema: CRITIC_JSON_SCHEMA,
      context: "critic",
      maxTokens: 700,
    });

    if (Array.isArray(raw?.defects)) {
      judged = raw.defects
        .filter((d: any) => typeof d?.issue === "string" && d.issue.trim())
        .map((d: any) => ({
          severity: d.severity === "blocking" ? "blocking" : "warning",
          day: typeof d.day === "number" && d.day > 0 ? Math.round(d.day) : null,
          issue: String(d.issue).trim().slice(0, 200),
        }))
        .slice(0, 8);
    }
  } catch (err) {
    // The mechanical findings still stand if the judgement pass fails.
    console.error("Critic judgement pass failed:", err);
  }

  const defects = [...mechanical, ...judged];
  return {
    defects,
    approved: !defects.some((d) => d.severity === "blocking"),
  };
}
