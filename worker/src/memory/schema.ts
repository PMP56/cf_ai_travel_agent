export interface UserProfile {
  name?: string;
  budget?: number;
  homeCountry?: string;
  travelStyle?: string;
  pastTrips?: {
    destination: string;
    date: string;
    summary: string;
  }[];
}

export interface UserMemoryState {
  profile: UserProfile;
  lastUpdated: string;
}