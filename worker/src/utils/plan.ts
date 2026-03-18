export interface Highlight {
  title: string;
  date: string;        // e.g. "Day 3" or "Day 7–8"
  description: string;
}

export interface TravelPlan {
  destination: string;
  destinationOverview: string;   // destination + overview as markdown string
  highlights: Highlight[];
  optionalAddOns: string;        // add-ons + tips as markdown string
}