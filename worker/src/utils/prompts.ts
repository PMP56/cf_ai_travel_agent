import { UserProfile } from "../memory/schema";

export function buildPlanPrompt(message: string, userProfile: UserProfile): string {
  const preferencesContext = userProfile.preferences?.length
    ? `\nKnown user preferences: ${userProfile.preferences.slice(-3).join(", ")}.`
    : "";

  return `You are an AI travel planner.${preferencesContext}

The user says: "${message}"

Return ONLY a raw JSON object — no markdown, no backticks, no explanation.

The JSON must follow this exact shape:
{
  "destinationOverview": "<2–3 sentence overview including destination name, duration, budget range, and best time to visit>",
  "highlights": [
    {
      "title": "<short activity title>",
      "date": "<suggested day, e.g. Day 1, Day 3–4>",
      "description": "<1–2 sentence description of the activity>"
    }
  ],
  "optionalAddOns": "<paragraph of optional activities, tips, and recommendations>"
}

Rules:
- highlights must be an array of 5–7 items
- Every field must be a non-empty string
- Do not include any text outside the JSON object`;
}