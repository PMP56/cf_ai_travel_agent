import { TripBrief, missingBriefFields } from "./schema/trip";
import { ResolvedPlace, geocodeDestination } from "./tools/geocode";
import { runIntake } from "./agents/intake";
import { runClimateAgent, ClimateGuidance } from "./agents/climate";
import { runPlacesAgent, CuratedPlace } from "./agents/places";
import { runDestinationAgent, DestinationBrief } from "./agents/destination";
import { runFoodAgent, FoodBrief } from "./agents/food";
import { runComposer, Itinerary } from "./agents/compose";
import { runCritic, Critique } from "./agents/critic";

/**
 * The plan pipeline, in one place, emitting progress as it goes.
 *
 * Extracted from the route handler so the same code serves both the plain JSON
 * endpoint and the streaming one — the only difference is whether anyone is
 * listening to `onEvent`. A full plan takes 30-60 seconds, which is far too
 * long to show a spinner, so every stage reports itself.
 */

export type AgentName =
  | "intake"
  | "destination"
  | "climate"
  | "places"
  | "food"
  | "composer"
  | "critic";

export type PipelineEvent =
  | { type: "agent:start"; agent: AgentName }
  | { type: "agent:done"; agent: AgentName; ms: number; summary: string }
  | { type: "agent:failed"; agent: AgentName; ms: number; reason: string }
  | { type: "agent:skipped"; agent: AgentName; reason: string }
  | { type: "brief"; brief: TripBrief; place: ResolvedPlace | null; alternatives: ResolvedPlace[] }
  | { type: "complete"; result: PlanResult }
  | { type: "error"; message: string };

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

export type EventSink = (event: PipelineEvent) => void;

/**
 * Turn an upstream failure into something a user can act on.
 *
 * Workers AI reports an exhausted free tier as error 4006, and the free
 * allowance is only about seven full plans a day — so this is the failure this
 * project hits most often. Reporting it as "could not understand the request"
 * sends people off rewriting a perfectly good sentence.
 */
export function explainFailure(err: unknown): string {
  const message = err instanceof Error ? err.message : String(err);

  if (message.includes("4006") || message.toLowerCase().includes("daily free allocation")) {
    return "Out of Workers AI credit for today — the free tier covers roughly seven plans per day. It resets at 00:00 UTC, or the Workers Paid plan removes the cap.";
  }
  if (message.includes("429") || message.toLowerCase().includes("rate limit")) {
    return "The planner is rate limited right now. Wait a moment and try again.";
  }
  if (/timed out|timeout|aborted|abort/i.test(message)) {
    return "A source took too long to respond. Try again.";
  }
  return `Could not build a plan: ${message}`;
}

/**
 * Wrap an agent so it always reports, always times itself, and never throws.
 * Specialists are enrichment — one failing must not lose the others' work.
 */
async function stage<T>(
  agent: AgentName,
  emit: EventSink,
  fallback: T,
  summarise: (value: T) => string,
  run: () => Promise<T>
): Promise<T> {
  const started = Date.now();
  emit({ type: "agent:start", agent });
  try {
    const value = await run();
    emit({ type: "agent:done", agent, ms: Date.now() - started, summary: summarise(value) });
    return value;
  } catch (err) {
    emit({
      type: "agent:failed",
      agent,
      ms: Date.now() - started,
      reason: err instanceof Error ? err.message : String(err),
    });
    return fallback;
  }
}

/**
 * Either a fresh request in the user's words, or a brief the user has edited.
 *
 * The second form is what makes this a workspace rather than a chat: changing
 * "7 days" to "10" re-runs the plan against the SAME structured intent instead
 * of re-parsing a new sentence and getting a subtly different trip.
 */
export type PipelineInput =
  | { kind: "message"; message: string }
  | { kind: "brief"; brief: TripBrief; place: ResolvedPlace | null };

export async function runPipeline(
  ai: Ai,
  input: PipelineInput,
  emit: EventSink = () => {}
): Promise<PlanResult> {
  let brief: TripBrief;
  let place: ResolvedPlace | null;
  let alternatives: ResolvedPlace[] = [];

  if (input.kind === "brief") {
    // The brief is already settled, so intake has nothing to do. Re-resolve the
    // destination only if it changed, which is why the caller passes the old one.
    brief = input.brief;
    place = input.place;
    emit({ type: "agent:skipped", agent: "intake", reason: "brief supplied" });

    const needle = brief.destinationCity ?? brief.destination;
    if (!place || place.name.toLowerCase() !== needle.toLowerCase()) {
      const matches = await geocodeDestination(needle).catch(() => []);
      if (matches.length > 0) place = matches[0];
    }
  } else {
    // Intake is the only truly required step: everything downstream reads the
    // brief, so a failure here is fatal rather than degraded. It is handled
    // inline rather than through stage() so the real reason survives — wrapping
    // it lost the cause and reported every failure as unintelligible input.
    const started = Date.now();
    emit({ type: "agent:start", agent: "intake" });

    try {
      const intake = await runIntake(ai, input.message);
      emit({
        type: "agent:done",
        agent: "intake",
        ms: Date.now() - started,
        summary: `${intake.brief.destination}${intake.place ? ` → ${intake.place.name}, ${intake.place.country}` : ""}`,
      });
      brief = intake.brief;
      place = intake.place;
      alternatives = intake.alternatives;
    } catch (err) {
      const reason = explainFailure(err);
      emit({ type: "agent:failed", agent: "intake", ms: Date.now() - started, reason });
      throw new Error(reason);
    }
  }

  emit({ type: "brief", brief, place, alternatives });

  // 2. Specialists are independent and grounded — fan them out.
  const [destination, climate, places, food] = await Promise.all([
    stage("destination", emit, null as DestinationBrief | null,
      (v) => (v ? `${v.source.title} guide` : "no guide found"),
      () => runDestinationAgent(ai, brief)),

    place
      ? stage("climate", emit, null as ClimateGuidance | null,
          (v) => (v ? `${v.normals.avgHighC}/${v.normals.avgLowC}C in ${v.normals.month}` : "no data"),
          () => runClimateAgent(ai, brief, place))
      : skip("climate", emit, "no resolved location", null),

    place
      ? stage("places", emit, [] as CuratedPlace[],
          (v) => `${v.length} places`,
          () => runPlacesAgent(ai, brief, place))
      : skip("places", emit, "no resolved location", [] as CuratedPlace[]),

    stage("food", emit, null as FoodBrief | null,
      (v) => (v ? `${v.dishes.length} dishes` : "no guide found"),
      () => runFoodAgent(ai, brief)),
  ]);

  // 3. Composition needs the specialists' output, so it is necessarily serial.
  const itinerary =
    place && places.length > 0
      ? await stage("composer", emit, null as Itinerary | null,
          (v) => (v ? `${v.days.length} days, ${v.totalTravelKm}km` : "failed"),
          () => runComposer(ai, brief, place, places, climate))
      : skip("composer", emit, "no places to arrange", null);

  // 4. The quality gate.
  const critique = itinerary
    ? await stage("critic", emit, null as Critique | null,
        (v) => (v ? (v.approved ? `approved, ${v.defects.length} note(s)` : `${v.defects.length} defect(s)`) : "failed"),
        () => runCritic(ai, brief, itinerary, climate))
    : skip("critic", emit, "no itinerary to review", null);

  return {
    brief, place, alternatives, destination, climate, places, food,
    itinerary, critique,
    missing: missingBriefFields(brief),
  };
}

function skip<T>(agent: AgentName, emit: EventSink, reason: string, fallback: T): T {
  emit({ type: "agent:skipped", agent, reason });
  return fallback;
}
