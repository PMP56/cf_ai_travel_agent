import { runStructured } from "../utils/structured";
import { getDestinationGuide, DestinationGuide } from "../tools/wikivoyage";
import { TripBrief } from "../schema/trip";

/**
 * Agent 4 — Food.
 *
 * Reads the Wikivoyage Eat/Drink sections rather than naming restaurants.
 *
 * Specific venues are the single worst thing for an AI planner to invent — they
 * close, move, and are impossible for a reader to verify at a glance — and the
 * keyless sources cannot support them: OSM returns restaurant names in the
 * local script with no quality signal, and Wikivoyage's own listings are
 * inconsistently marked up. What the guides DO carry reliably is what a place
 * eats and how dining works there, which is the more useful half anyway.
 */

const SYSTEM = `You advise a traveller on eating at a destination, using real excerpts from a Wikivoyage guide.

Use ONLY what the excerpts say. Return "" or an empty list rather than filling gaps from your own knowledge.

- dishes: 3-6 specific local dishes or drinks the guide names. Just the names, with at most a handful of words of gloss. No generic entries like "local cuisine" or "street food".
- advice: 1-2 sentences on how eating actually works here — meal times, where people eat, ordering, tipping, prices — drawn from the guide. Practical, not scene-setting.
- dietaryNote: if the traveller stated a dietary constraint, one sentence on how well the guide suggests it is catered for, and name a dish from the guide that fits if there is one. "" if they stated no constraint, or if the guide gives you nothing to go on. Never reassure them without evidence.`;

const FOOD_JSON_SCHEMA = {
  type: "object",
  properties: {
    dishes: { type: "array", items: { type: "string" } },
    advice: { type: "string" },
    dietaryNote: { type: "string" },
  },
  required: ["dishes", "advice", "dietaryNote"],
} as const;

export interface FoodBrief {
  dishes: string[];
  advice: string;
  dietaryNote: string | null;
  source: { title: string; url: string };
}

/** Only the food-related sections; everything else is prompt tokens wasted. */
function renderFoodSections(guide: DestinationGuide): string | null {
  const parts = (["Eat", "Drink"] as const)
    .filter((k) => guide.sections[k])
    .map((k) => `## ${k}\n${guide.sections[k]}`);
  return parts.length ? parts.join("\n\n") : null;
}

function richer(a: DestinationGuide | null, b: DestinationGuide | null): DestinationGuide | null {
  if (!a) return b;
  if (!b) return a;
  const score = (g: DestinationGuide) =>
    (g.sections.Eat?.length ?? 0) + (g.sections.Drink?.length ?? 0);
  return score(b) > score(a) ? b : a;
}

export async function runFoodAgent(ai: Ai, brief: TripBrief): Promise<FoodBrief | null> {
  // Eat sections run long — Kyoto's is 4,500 chars — and truncating to the
  // default 1,200 cut off shojin ryori and yatsuhashi entirely, leaving the
  // model with only a paragraph about credit cards. Input tokens cost a
  // fraction of output, so buying the whole section is the right trade.
  const opts = { maxSectionChars: 4500 };
  const lookups = [getDestinationGuide(brief.destination, opts).catch(() => null)];
  if (brief.destinationCity) {
    lookups.push(getDestinationGuide(brief.destinationCity, opts).catch(() => null));
  }

  const guides = await Promise.all(lookups);
  const guide = guides.reduce<DestinationGuide | null>((best, g) => richer(best, g), null);
  if (!guide) return null;

  const sections = renderFoodSections(guide);
  if (!sections) return null;

  const constraints = brief.constraints.length
    ? `Traveller's stated dietary constraints: ${brief.constraints.join(", ")}.`
    : "The traveller stated no dietary constraints.";

  const raw = await runStructured(ai, {
    system: SYSTEM,
    user: `Destination: ${guide.title}\n${constraints}\n\n${sections}`,
    schema: FOOD_JSON_SCHEMA,
    context: "food",
    maxTokens: 700,
  });

  const dishes = Array.isArray(raw?.dishes)
    ? raw.dishes
        .filter((d: unknown): d is string => typeof d === "string" && d.trim().length > 0)
        .map((d: string) => d.trim().slice(0, 80))
        .slice(0, 6)
    : [];

  const advice = typeof raw?.advice === "string" ? raw.advice.trim() : "";
  if (dishes.length === 0 && !advice) return null;

  const note = typeof raw?.dietaryNote === "string" ? raw.dietaryNote.trim() : "";

  return {
    dishes,
    advice,
    dietaryNote: note || null,
    source: { title: guide.title, url: guide.url },
  };
}
