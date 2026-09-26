/**
 * Mirrors the worker's v2 pipeline output.
 *
 * Kept in sync by hand with worker/src — see docs/PROGRESS.md backlog. Changing
 * a shape here without changing it there produces silently blank UI, so the
 * two files should always be edited together.
 */

export type AgentName =
  | "intake"
  | "destination"
  | "climate"
  | "places"
  | "food"
  | "composer"
  | "critic";

export const AGENT_ORDER: AgentName[] = [
  "intake",
  "destination",
  "climate",
  "places",
  "food",
  "composer",
  "critic",
];

/** What each agent is actually grounded in — shown in the UI as provenance. */
export const AGENT_SOURCE: Record<AgentName, string> = {
  intake: "your request",
  destination: "Wikivoyage",
  climate: "ERA5 archive",
  places: "Wikipedia",
  food: "Wikivoyage",
  composer: "geometry",
  critic: "review",
};

export interface TripBrief {
  destination: string;
  destinationCity: string | null;
  durationDays: number | null;
  travelMonth: string | null;
  budget: { amount: number; currency: string } | null;
  partySize: number | null;
  pace: "relaxed" | "moderate" | "packed" | null;
  interests: string[];
  constraints: string[];
}

export interface ResolvedPlace {
  name: string;
  country: string;
  countryCode: string;
  admin1: string | null;
  latitude: number;
  longitude: number;
  timezone: string;
  population: number | null;
}

export interface ClimateNormals {
  month: string;
  yearsSampled: number;
  avgHighC: number;
  avgLowC: number;
  avgPrecipitationMm: number;
  rainyDayFraction: number;
  recordHighC: number;
  recordLowC: number;
  avgWindKph: number;
  peakWindKph: number;
}

export interface ClimateGuidance {
  normals: ClimateNormals;
  /** Every month, keyed by full English name — powers the year chart. */
  year: Record<string, ClimateNormals>;
  summary: string;
  packing: string[];
  caution: string | null;
  comfortRating: number;
}

export interface CuratedPlace {
  title: string;
  latitude: number;
  longitude: number;
  distanceM: number;
  viewsPerDay: number;
  summary: string;
  url: string;
  /** Wikipedia's lead image, when it has one. */
  imageUrl: string | null;
  imageWidth: number | null;
  imageHeight: number | null;
  category: string;
  why: string;
}

export interface DestinationBrief {
  overview: string;
  gettingAround: string;
  safety: string | null;
  etiquette: string | null;
  source: { title: string; url: string };
}

export interface FoodBrief {
  dishes: string[];
  advice: string;
  dietaryNote: string | null;
  source: { title: string; url: string };
}

export interface ItineraryDay {
  day: number;
  title: string;
  note: string;
  places: CuratedPlace[];
  travelKm: number;
}

export interface Itinerary {
  days: ItineraryDay[];
  unscheduledDays: number;
  /** Good places left out to keep the requested pace. */
  droppedForPace: number;
  totalTravelKm: number;
}

export interface Defect {
  severity: "blocking" | "warning";
  day: number | null;
  issue: string;
}

export interface Critique {
  defects: Defect[];
  approved: boolean;
}

export interface PlanResult {
  brief: TripBrief;
  place: ResolvedPlace | null;
  alternatives: ResolvedPlace[];
  destination: DestinationBrief | null;
  climate: ClimateGuidance | null;
  places: CuratedPlace[];
  food: FoodBrief | null;
  itinerary: Itinerary | null;
  critique: Critique | null;
  missing: string[];
}

/** Events streamed from POST /api/v2/stream. */
export type PipelineEvent =
  | { type: "agent:start"; agent: AgentName }
  | { type: "agent:done"; agent: AgentName; ms: number; summary: string }
  | { type: "agent:failed"; agent: AgentName; ms: number; reason: string }
  | { type: "agent:skipped"; agent: AgentName; reason: string }
  | {
      type: "brief";
      brief: TripBrief;
      place: ResolvedPlace | null;
      alternatives: ResolvedPlace[];
    }
  | { type: "complete"; result: PlanResult }
  | { type: "error"; message: string };

export type AgentStatus = "idle" | "running" | "done" | "failed" | "skipped";

export interface AgentState {
  status: AgentStatus;
  ms: number | null;
  detail: string | null;
}
