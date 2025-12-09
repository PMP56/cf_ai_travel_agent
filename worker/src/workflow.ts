import { UserProfile } from "./memory/schema";

export interface WorkflowResult {
  itinerary: any;
  schedule: any;
  packing: any;
  updatedProfile: UserProfile;
}

export async function executeWorkflow(ai: Ai, message: string, userProfile: UserProfile) {
  const prompt = `
    You are an AI travel planner.

    The user says:
    "${message}"

    Respond with a concise and beautifully formatted travel plan in Markdown.
    Include:

    # Destination
    **Duration**
    **Estimated Budget**
    **Best Time to Visit**

    ## Overview
    Short paragraph.

    ## Highlights
    - 5–7 highlights

    ## Optional Add-ons
    - Activities
    - Tips

    Keep it short but helpful.
  `;

  console.log("Generating travel plan...");
  const response = await ai.run("@cf/meta/llama-3.3-70b-instruct-fp8-fast", {
    messages: [
      { role: "system", content: "You are a helpful travel planning assistant." },
      { role: "user", content: prompt }
    ]
  });

  console.log("Updating user profile with new preferences...");
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
      { role: "user", content: memoryPrompt }
    ]
  });

  const extractedPrefs = (memoryResponse as any).response;
  const updatedProfile: UserProfile = {
    ...userProfile,
    preferences: [
      ...(userProfile.preferences || []),
      extractedPrefs,
    ],
  };

  return { plan: response, updatedProfile };
}