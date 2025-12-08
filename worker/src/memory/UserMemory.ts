import { DurableObject } from "cloudflare:workers";
import { UserProfile, UserMemoryState } from "./schema";

interface Env {}

export class UserMemory extends DurableObject {
  private state: DurableObjectState;

  constructor(state: DurableObjectState, env: Env) {
    super(state, env);
    this.state = state;
  }

  // Load user profile
  async load(): Promise<UserProfile> {
    const data = await this.state.storage.get<UserMemoryState>("profile");
    return data?.profile ?? {};
  }

  // Save user profile
  async save(profile: UserProfile): Promise<void> {
    const data: UserMemoryState = {
      profile,
      lastUpdated: new Date().toISOString(),
    };
    await this.state.storage.put("profile", data);
  }

  // Reset memory
  async reset(): Promise<void> {
    await this.state.storage.deleteAll();
  }

  // Handle DO fetch() requests
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    if (path === "/load" && request.method === "GET") {
      const profile = await this.load();
      return Response.json({ profile });
    }

    if (path === "/save" && request.method === "POST") {
      const profile = (await request.json()) as UserProfile;
      await this.save(profile);
      return Response.json({ success: true });
    }

    if (path === "/reset" && request.method === "POST") {
      await this.reset();
      return Response.json({ success: true });
    }

    return new Response("Not found", { status: 404 });
  }
}

// Helper: get profile from DO
export async function getUserProfile(
  stub: DurableObjectStub
): Promise<UserProfile> {
  const response = await stub.fetch("http://do/load");
  const data = (await response.json()) as { profile: UserProfile };
  return data.profile;
}

// Helper: update profile in DO
export async function updateUserProfile(
  stub: DurableObjectStub,
  profile: UserProfile
): Promise<void> {
  await stub.fetch("http://do/save", {
    method: "POST",
    body: JSON.stringify(profile),
  });
}
