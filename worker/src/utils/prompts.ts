import { UserProfile } from "../memory/schema";

export function buildPlanPrompt(message: string, userProfile: UserProfile): string {
  const preferencesContext = userProfile.preferences?.length
    ? `\nKnown user preferences: ${userProfile.preferences.slice(-3).join(", ")}.`
    : "";

  return `You are an AI travel planner.${preferencesContext}

The user says: "${message}"

Return ONLY a raw JSON object - no markdown, no backticks, no explanation.

The JSON must follow this exact shape:
{
  "destination": "<destination name>",
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

Rules for highlights:
- Extract the trip duration from the user's message (e.g. "2 weeks" = 14 days, "10 days" = 10 days)
- Cover every single day from Day 1 through the final day with no gaps
- Each day must appear at least once — never skip a day
- Assign 1–3 highlights per day depending on how activity-dense that day is. Travel days and rest days get 1. Full sightseeing or hiking days get 2–3
- Keep the total number of highlights reasonable: aim for roughly 1.5 highlights per day on average (e.g. a 14-day trip = ~20 highlights, a 7-day trip = ~10)
- Use "Day 1", "Day 2" etc. as the date value — no ranges like "Day 3-4"
- Multiple highlights on the same day all share the exact same date string (e.g. all three use "Day 3") so they group correctly


Other rules:
- destination: just the place name, e.g. "Patagonia" or "Rome, Italy"
- destinationOverview: 2–3 sentences covering destination, duration, budget, best time to visit
- Every field must be a non-empty string
- Do not include any text outside the JSON object`;
}