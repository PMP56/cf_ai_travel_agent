// worker/src/utils/prompts.ts  (replace the entire dead file with just this)

import { UserProfile } from "../memory/schema";

export function buildPlanPrompt(message: string, userProfile: UserProfile): string {
  const preferencesContext = userProfile.preferences?.length
    ? `\nKnown user preferences: ${userProfile.preferences.slice(-3).join(", ")}.`
    : "";

  return `You are an AI travel planner.${preferencesContext}

    The user says: "${message}"

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

    Keep it short but helpful.`;
}