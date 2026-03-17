import { UserProfile } from "./memory/schema";
import { fetchDestinationPhotos, UnsplashPhoto } from "./utils/photos";
import { buildPlanPrompt } from "./utils/prompts";
import { extractDestination } from "./utils/exxtractDestination";
import { TravelPlan } from "./utils/plan";

export interface WorkflowResult {
  plan: any;
  photos: UnsplashPhoto[];
  updatedProfile: UserProfile;
}

function parsePlanResponse(raw: unknown): TravelPlan {
  let parsed: any;

  if (typeof raw === "object" && raw !== null) {
    parsed = raw;
  } else if (typeof raw === "string") {
    const cleaned = raw
      .replace(/```json\s*/gi, "")
      .replace(/```\s*/g, "")
      .trim();
    parsed = JSON.parse(cleaned);
  } else {
    throw new Error("Unexpected plan response format");
  }

  // Validate shape before trusting it
  if (
    typeof parsed.destinationOverview !== "string" ||
    !Array.isArray(parsed.highlights) ||
    typeof parsed.optionalAddOns !== "string"
  ) {
    throw new Error("Plan response is missing required fields");
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
    destinationOverview: parsed.destinationOverview,
    highlights,
    optionalAddOns: parsed.optionalAddOns,
  };
}

export async function executeWorkflow(
  ai: Ai,
  message: string,
  userProfile: UserProfile,
  unsplashKey: string
): Promise<WorkflowResult> {

  const [planResponse, destinationInfo] = await Promise.all([
    ai.run("@cf/meta/llama-3.3-70b-instruct-fp8-fast", {
      max_tokens: 2048,
      messages: [
        { role: "system", content: "You are a helpful travel planning assistant." },
        { role: "user", content: buildPlanPrompt(message, userProfile) },
      ],
    }),
    extractDestination(ai, message),
  ]);

  const plan = parsePlanResponse((planResponse as any).response);

  const photos =
    destinationInfo.destination && unsplashKey
      ? await fetchDestinationPhotos(destinationInfo.destination, unsplashKey)
      : [];

  const memoryPrompt = `
    Extract the user's travel preferences from this message:
    "${message}"

    Return a SINGLE short sentence summarizing stable preferences.

    Examples:
    - "Prefers budget-friendly beach vacations."
    - "Likes adventure trips and hiking."
    - "Enjoys cultural travel in Asia."

    Return ONLY the sentence, no JSON, no formatting.
  `;

  const memoryResponse = await ai.run("@cf/meta/llama-3.3-70b-instruct-fp8-fast", {
    messages: [
      { role: "system", content: "Extract concise travel preferences as plain text." },
      { role: "user", content: memoryPrompt },
    ],
  });

  const extractedPrefs = (memoryResponse as any).response as string;
  const updatedPreferences = [
    ...(userProfile.preferences ?? []),
    extractedPrefs,
  ].slice(-10);

  return {
    plan,
    photos,
    updatedProfile: { ...userProfile, preferences: updatedPreferences },
  };
}