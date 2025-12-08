export interface TravelPlanResponse {
  response: string; // markdown content returned from the model
}

export interface TravelAPIResponse {
  plan: TravelPlanResponse;
  message: string;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}
