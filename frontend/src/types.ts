export interface TravelPlanResponse {
  response: string;
}

export interface TravelAPIResponse {
  plan: TravelPlanResponse;
  message: string;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}
