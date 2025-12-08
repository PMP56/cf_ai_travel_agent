import { callLlamaJSON } from "./ai";
import { UserProfile } from "./memory/schema";
import {
  getIntentPrompt,
  getItineraryPrompt,
  getSchedulePrompt,
  getPackingPrompt,
  getMemoryUpdatePrompt,
} from "./utils/prompts";

export interface WorkflowResult {
  itinerary: any;
  schedule: any;
  packing: any;
  updatedProfile: UserProfile;
}

export async function executeWorkflow(ai: Ai, message: string) {
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

  const response = await ai.run("@cf/meta/llama-3.3-70b-instruct-fp8-fast", {
    messages: [
      { role: "system", content: "You are a helpful travel planning assistant." },
      { role: "user", content: prompt }
    ]
  });

  return { plan: response };
}


// export async function executeWorkflow(
//   ai: Ai,
//   userMessage: string,
//   userProfile: UserProfile,
// ): Promise<any> {
//   console.log("Step 1: Interpreting user intent...");
//   const intent = await callLlamaJSON(
//     ai,
//     getIntentPrompt(userProfile),
//     userMessage,
//   );

//   console.log("Steps 2-4: Generating itinerary, schedule, and packing in parallel...");
//   const [itinerary, schedule, packing] = await Promise.all([
//     callLlamaJSON(
//       ai,
//       getItineraryPrompt(userProfile, intent),
//       `Create an itinerary for: ${userMessage}`,
//     ),
//     callLlamaJSON(
//       ai,
//       getSchedulePrompt(userProfile, intent), // Use intent, not itinerary
//       `Create a detailed daily schedule, focusing on 3-4 main activities per day for: ${userMessage}`,
//     ),
//     callLlamaJSON(
//       ai,
//       getPackingPrompt(userProfile, intent), // Use intent, not itinerary
//       `Create a packing list for: ${userMessage}`,
//     ),
//   ]);

//   console.log("Step 5: Updating user memory...");
//   const updatedProfile = await callLlamaJSON(
//     ai,
//     getMemoryUpdatePrompt(userProfile, intent),
//     `Update profile based on: ${userMessage}`,
//   );

//   return { itinerary, schedule, packing, updatedProfile };
// }