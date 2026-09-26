import { UserProfile } from "./memory/schema";
import { fetchDestinationPhotos, UnsplashPhoto } from "./utils/photos";
import { buildPlanPrompt, buildReplaceHighlightPrompt } from "./utils/prompts";
import { Highlight, TravelPlan } from "./utils/plan";
import { parseAiJson } from "./utils/aiJson";

const MODEL = "@cf/meta/llama-3.3-70b-instruct-fp8-fast";

export interface WorkflowResult {
  plan: TravelPlan;
  photos: UnsplashPhoto[];
  updatedProfile: UserProfile;
}

export interface ReplaceHighlightParams {
  destination: string;
  day: string;
  currentTitle: string;
  allHighlights: { title: string; date: string }[];
}

function parsePlanResponse(raw: unknown): TravelPlan {
  const parsed = parseAiJson(raw, "travel plan");

  if (
    typeof parsed.destination !== "string" ||
    typeof parsed.destinationOverview !== "string" ||
    !Array.isArray(parsed.highlights) ||
    typeof parsed.optionalAddOns !== "string"
  ) {
    throw new Error("Plan response is missing required fields");
  }

  // An empty array passes Array.isArray but renders as a plan with no itinerary.
  if (parsed.highlights.length === 0) {
    throw new Error("Plan response contains no highlights");
  }

  const highlights = parsed.highlights.map((h: any, i: number) => {
    if (
      typeof h.title !== "string" ||
      typeof h.date !== "string" ||
      typeof h.description !== "string"
    ) {
      throw new Error(`Highlight at index ${i} is malformed`);
    }
    return { title: h.title, date: h.date, description: h.description };
  });

  return {
    destination: parsed.destination,
    destinationOverview: parsed.destinationOverview,
    highlights,
    optionalAddOns: parsed.optionalAddOns,
  };
}

export async function executeWorkflow(
  ai: Ai,
  message: string,
  userProfile: UserProfile,
  unsplashKey: string | undefined
): Promise<WorkflowResult> {
  // The plan is the only load-bearing call: if it fails, the request fails.
  const planResponse = await ai.run(MODEL, {
    max_tokens: 2048,
    messages: [
      { role: "system", content: "You are a helpful travel planning assistant. Always respond with raw JSON only." },
      { role: "user", content: buildPlanPrompt(message, userProfile) },
    ],
  });

  const plan = parsePlanResponse((planResponse as any).response);

  // Photos and preference extraction are both enrichment. Neither may take down
  // a plan that was generated successfully, so both swallow their own failures.
  const [photos, extractedPrefs] = await Promise.all([
    plan.destination && unsplashKey
      ? fetchDestinationPhotos(plan.destination, unsplashKey).catch((err) => {
          console.error("Photo fetch failed:", err);
          return [] as UnsplashPhoto[];
        })
      : Promise.resolve([] as UnsplashPhoto[]),
    ai
      .run(MODEL, {
        max_tokens: 128,
        messages: [
          { role: "system", content: "Extract concise travel preferences as plain text." },
          {
            role: "user",
            content: `Extract the user's travel preferences from this message: "${message}"
            Return a SINGLE short sentence summarizing stable preferences.
            Examples:
            - "Prefers budget-friendly beach vacations."
            - "Likes adventure trips and hiking."
            Return ONLY the sentence, no JSON, no formatting.`,
          },
        ],
      })
      .then((res) => {
        const text = (res as any)?.response;
        return typeof text === "string" && text.trim() ? text.trim() : null;
      })
      .catch((err) => {
        console.error("Preference extraction failed:", err);
        return null;
      }),
  ]);

  const updatedPreferences = extractedPrefs
    ? [...(userProfile.preferences ?? []), extractedPrefs].slice(-10)
    : userProfile.preferences ?? [];

  return {
    plan,
    photos,
    updatedProfile: { ...userProfile, preferences: updatedPreferences },
  };
}

export async function replaceHighlight(
  ai: Ai,
  params: ReplaceHighlightParams
): Promise<Highlight> {
  const response = await ai.run(MODEL, {
    max_tokens: 256,
    messages: [
      { role: "system", content: "You are a travel planner. Always respond with raw JSON only." },
      { role: "user", content: buildReplaceHighlightPrompt(params) },
    ],
  });

  const parsed = parseAiJson((response as any)?.response, "replacement activity");

  if (
    typeof parsed.title !== "string" ||
    typeof parsed.date !== "string" ||
    typeof parsed.description !== "string"
  ) {
    throw new Error("Replacement highlight is missing required fields");
  }

  return {
    title: parsed.title,
    date: parsed.date,
    description: parsed.description,
  };
}
