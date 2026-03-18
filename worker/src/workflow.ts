import { UserProfile } from "./memory/schema";
import { fetchDestinationPhotos, UnsplashPhoto } from "./utils/photos";
import { buildPlanPrompt } from "./utils/prompts";
import { extractDestination } from "./utils/exxtractDestination";
import { Highlight, TravelPlan } from "./utils/plan";

export interface WorkflowResult {
  plan: any;
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
    typeof parsed.destination !== "string" ||
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
  unsplashKey: string
): Promise<WorkflowResult> {

  const planResponse = await ai.run("@cf/meta/llama-3.3-70b-instruct-fp8-fast", {
    max_tokens: 2048,
    messages: [
      { role: "system", content: "You are a helpful travel planning assistant. Always respond with raw JSON only." },
      { role: "user", content: buildPlanPrompt(message, userProfile) },
    ],
  });

  const plan = parsePlanResponse((planResponse as any).response);

  const [photos, memoryResponse] = await Promise.all([
    plan.destination && unsplashKey
      ? fetchDestinationPhotos(plan.destination, unsplashKey)
      : Promise.resolve([]),
    ai.run("@cf/meta/llama-3.3-70b-instruct-fp8-fast", {
      messages: [
        { role: "system", content: "Extract concise travel preferences as plain text." },
        { role: "user", content: `Extract the user's travel preferences from this message: "${message}"
            Return a SINGLE short sentence summarizing stable preferences.
            Examples:
            - "Prefers budget-friendly beach vacations."
            - "Likes adventure trips and hiking."
            Return ONLY the sentence, no JSON, no formatting.` 
        },
      ],
    }),
  ]);

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


export async function replaceHighlight(
  ai: Ai,
  { destination, day, currentTitle, allHighlights }: ReplaceHighlightParams
): Promise<Highlight> {
  // Build a list of all existing activities so the LLM doesn't suggest duplicates
  const existingActivities = allHighlights
    .map((h) => `- ${h.title} (${h.date})`)
    .join("\n");

  const prompt = `You are a travel planner updating a single activity in an existing itinerary.

Destination: ${destination}
Day to update: ${day}
Activity to replace: "${currentTitle}"

Full existing itinerary (do NOT suggest any of these):
${existingActivities}

Suggest ONE different activity for ${day} in ${destination} that:
- Is not already in the itinerary above
- Fits naturally on ${day} alongside any other activities already scheduled that day
- Is realistic and specific to ${destination}

Return ONLY a raw JSON object, no markdown, no backticks:
{"title":"...","date":"${day}","description":"..."}

- title: short activity name
- date: must be exactly "${day}"
- description: 1–2 sentences describing the activity`;

  const response = await ai.run("@cf/meta/llama-3.3-70b-instruct-fp8-fast", {
    max_tokens: 256,
    messages: [
      { role: "system", content: "You are a travel planner. Always respond with raw JSON only." },
      { role: "user", content: prompt },
    ],
  }) as any;

  const raw = response?.response;
  let parsed: any;

  if (typeof raw === "object" && raw !== null) {
    parsed = raw;
  } else if (typeof raw === "string") {
    const cleaned = raw.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
    parsed = JSON.parse(cleaned);
  } else {
    throw new Error("Unexpected response format from AI");
  }

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