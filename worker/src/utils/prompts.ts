import { UserProfile } from "../memory/schema";

export function getIntentPrompt(profile: UserProfile): string {
  return `You are a travel assistant analyzing user requests. Extract the user's travel intent from their message.

User Profile:
${JSON.stringify(profile, null, 2)}


You MUST RETURN ONLY VALID JSON.
NO explanations.
NO comments.
NO markdown.
NO missing commas.
NO trailing commas.
NO line breaks inside strings.
Return ONLY a JSON object with this structure:
{
  "intent": "plan_trip" | "ask_question" | "update_preferences",
  "destination": "destination name or null",
  "dates": "travel dates or null",
  "travelers": number or null,
  "budget": number or null,
  "interests": ["interest1", "interest2"] or []
}`;
}

export function getItineraryPrompt(
  profile: UserProfile,
  intent: any,
): string {
  return `You are a travel expert creating a custom itinerary.

User Profile:
${JSON.stringify(profile, null, 2)}

Travel Request:
${JSON.stringify(intent, null, 2)}

Create a detailed itinerary. 
You MUST RETURN ONLY VALID JSON.
NO explanations.
NO comments.
NO markdown.
NO missing commas.
NO trailing commas.
NO line breaks inside strings.
Return ONLY a JSON object with this structure:
{
  "destination": "destination name",
  "duration": "X days",
  "overview": "trip overview",
  "highlights": ["highlight1", "highlight2", "highlight3"],
  "estimatedCost": number,
  "bestTimeToVisit": "season/month"
}`;
}

export function getSchedulePrompt(
  profile: UserProfile,
  itinerary: any,
): string {
  return `You are a travel planner creating a daily schedule.

User Profile:
${JSON.stringify(profile, null, 2)}

Itinerary:
${JSON.stringify(itinerary, null, 2)}

Create a day-by-day schedule. 
You MUST RETURN ONLY VALID JSON.
NO explanations.
NO comments.
NO markdown.
NO missing commas.
NO trailing commas.
NO line breaks inside strings.
Return ONLY a JSON object with this structure:
{
  "days": [
    {
      "day": 1,
      "title": "Day title",
      "activities": [
        {
          "time": "9:00 AM",
          "activity": "Activity name",
          "description": "Details",
          "cost": number or null
        }
      ]
    }
  ]
}`;
}

export function getPackingPrompt(
  profile: UserProfile,
  itinerary: any,
): string {
  return `You are a travel expert creating a packing list.

User Profile:
${JSON.stringify(profile, null, 2)}

Itinerary:
${JSON.stringify(itinerary, null, 2)}

Create a comprehensive packing list. 
You MUST RETURN ONLY VALID JSON.
NO explanations.
NO comments.
NO markdown.
NO missing commas.
NO trailing commas.
NO line breaks inside strings.
Return ONLY a JSON object with this structure:
{
  "categories": [
    {
      "name": "Clothing",
      "items": ["item1", "item2", "item3"]
    },
    {
      "name": "Toiletries",
      "items": ["item1", "item2"]
    },
    {
      "name": "Electronics",
      "items": ["item1", "item2"]
    },
    {
      "name": "Documents",
      "items": ["item1", "item2"]
    }
  ],
  "weatherConsiderations": "weather info",
  "specialItems": ["special item notes"]
}`;
}

export function getMemoryUpdatePrompt(
  profile: UserProfile,
  intent: any,
): string {
  return `You are updating a user's travel profile based on their latest request.

Current Profile:
${JSON.stringify(profile, null, 2)}

Latest Request:
${JSON.stringify(intent, null, 2)}

Update the profile with any new information. Return ONLY a JSON object matching the UserProfile structure:
{
  "name": "name or null",
  "budget": number or null,
  "homeCountry": "country or null",
  "travelStyle": "style or null",
  "pastTrips": [array of trips]
}

Keep existing values if no new information is provided. Only add to pastTrips, don't remove existing ones.`;
}