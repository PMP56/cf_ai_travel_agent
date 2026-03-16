export interface UnsplashPhoto {
  id: string;
  url: string;
  thumb: string;
  altDescription: string;
  photographer: string;
  photographerUrl: string;
}

export interface TravelPlanResponse {
  response: string;
}

export interface TravelAPIResponse {
  plan: TravelPlanResponse;
  photos: UnsplashPhoto[];  // add this
  message: string;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  photos?: UnsplashPhoto[];  // attach photos to the message they belong to
}