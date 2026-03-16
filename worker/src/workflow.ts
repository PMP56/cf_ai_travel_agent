import { UserProfile } from "./memory/schema";
import { fetchDestinationPhotos, UnsplashPhoto } from "./utils/photos";
import { buildPlanPrompt } from "./utils/prompts";
import { extractDestination } from "./utils/exxtractDestination";

export interface WorkflowResult {
  plan: any;
  photos: UnsplashPhoto[];
  updatedProfile: UserProfile;
}

export async function executeWorkflow(
  ai: Ai,
  message: string,
  userProfile: UserProfile,
  unsplashKey: string
): Promise<WorkflowResult> {

  const [planResponse, destinationInfo] = await Promise.all([
    ai.run("@cf/meta/llama-3.3-70b-instruct-fp8-fast", {
      messages: [
        { role: "system", content: "You are a helpful travel planning assistant." },
        { role: "user", content: buildPlanPrompt(message, userProfile) },
      ],
    }),
    extractDestination(ai, message),
  ]);

  // Only fetch photos when it's an itinerary request with a real destination
  const shouldFetchPhotos =
    destinationInfo.destination !== null &&
    !!unsplashKey;

  const photos = shouldFetchPhotos
    ? await fetchDestinationPhotos(destinationInfo.destination!, unsplashKey)
    : [];

  // Extract and update user preferences
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

  // Cap preferences at last 10 to prevent unbounded growth
  const updatedPreferences = [
    ...(userProfile.preferences ?? []),
    extractedPrefs,
  ].slice(-10);

  const updatedProfile: UserProfile = {
    ...userProfile,
    preferences: updatedPreferences,
  };

  return { plan: planResponse, photos, updatedProfile };
}