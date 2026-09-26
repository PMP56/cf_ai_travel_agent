import { runStructured } from "../utils/structured";
import { getDestinationGuide, DestinationGuide } from "../tools/wikivoyage";
import { TripBrief } from "../schema/trip";

/**
 * Agent 1 — Destination.
 *
 * Turns a human-written Wikivoyage guide into the few things a planner needs up
 * front. Same contract as every specialist: fetch real prose in code, hand the
 * model only that prose, constrain the answer with a schema.
 *
 * The model is summarising a source, not recalling a place, so it must not add
 * facts the guide does not contain.
 */

const SYSTEM = `You summarise a travel guide for someone planning a trip. You are given real excerpts from a Wikivoyage article.

Use ONLY what the excerpts say. If an excerpt does not cover something, return "" for that field rather than filling it from your own knowledge. Inventing a fact here is worse than leaving it blank.

- overview: 2-3 sentences on what this place IS and why someone goes. Concrete and specific — what distinguishes it. No travel-brochure adjectives ("vibrant", "hidden gem", "must-see").
- gettingAround: 1-2 sentences on how a visitor actually moves around, naming the specific modes the guide mentions.
- safety: one sentence on a real, specific risk the guide raises. "" if the guide raises none. Do not invent generic caution.
- etiquette: one sentence on a local custom a visitor would otherwise get wrong. "" if the guide covers none.`;

const DESTINATION_JSON_SCHEMA = {
  type: "object",
  properties: {
    overview: { type: "string" },
    gettingAround: { type: "string" },
    safety: { type: "string" },
    etiquette: { type: "string" },
  },
  required: ["overview", "gettingAround", "safety", "etiquette"],
} as const;

export interface DestinationBrief {
  overview: string;
  gettingAround: string;
  safety: string | null;
  etiquette: string | null;
  source: { title: string; url: string };
}

function renderGuide(guide: DestinationGuide): string {
  return Object.entries(guide.sections)
    .map(([name, body]) => `## ${name}\n${body}`)
    .join("\n\n");
}

const str = (v: unknown): string => (typeof v === "string" ? v.trim() : "");
const orNull = (v: unknown): string | null => str(v) || null;

/**
 * Prefers the guide with more substance. A region page like "Patagonia" often
 * has only a lead paragraph, while its gateway city has the practical sections
 * a planner actually needs.
 */
function richer(a: DestinationGuide | null, b: DestinationGuide | null): DestinationGuide | null {
  if (!a) return b;
  if (!b) return a;
  return Object.keys(b.sections).length > Object.keys(a.sections).length ? b : a;
}

export async function runDestinationAgent(
  ai: Ai,
  brief: TripBrief
): Promise<DestinationBrief | null> {
  const lookups = [getDestinationGuide(brief.destination).catch(() => null)];
  if (brief.destinationCity) {
    lookups.push(getDestinationGuide(brief.destinationCity).catch(() => null));
  }

  const guides = await Promise.all(lookups);
  const guide = guides.reduce<DestinationGuide | null>((best, g) => richer(best, g), null);
  if (!guide) return null;

  const raw = await runStructured(ai, {
    system: SYSTEM,
    user: `Destination: ${guide.title}\n\n${renderGuide(guide)}`,
    schema: DESTINATION_JSON_SCHEMA,
    context: "destination",
    maxTokens: 640,
  });

  const overview = str(raw?.overview);
  if (!overview) return null;

  return {
    overview,
    gettingAround: str(raw?.gettingAround),
    safety: orNull(raw?.safety),
    etiquette: orNull(raw?.etiquette),
    source: { title: guide.title, url: guide.url },
  };
}
