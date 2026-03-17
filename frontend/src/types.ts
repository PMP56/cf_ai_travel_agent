export interface UnsplashPhoto {
  id: string;
  url: string;
  thumb: string;
  altDescription: string;
  photographer: string;
  photographerUrl: string;
}

export interface Highlight {
  title: string;
  date: string;
  description: string;
}

export interface TravelPlan {
  destinationOverview: string;
  highlights: Highlight[];
  optionalAddOns: string;
}


export interface TravelAPIResponse {
  plan: TravelPlan;
  photos: UnsplashPhoto[];
  message: string;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  plan?: TravelPlan;        // structured plan, only on assistant messages
  photos?: UnsplashPhoto[];
}