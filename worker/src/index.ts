import {
  UserMemory,
  getUserProfile,
  updateUserProfile,
} from "./memory/UserMemory";
import { executeWorkflow } from "./workflow";
import { corsHeaders, jsonResponse, errorResponse } from "./utils/helpers";

export { UserMemory };

interface Env {
  AI: Ai;
  USER_MEMORY: DurableObjectNamespace;
}

interface GenerateRequestBody {
  userId: string;
  message: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin") ?? undefined;

    // CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders(origin) });
    }

    // Health check
    if (url.pathname === "/" && request.method === "GET") {
      return new Response("AI Travel Concierge Worker is running!", {
        status: 200,
        headers: corsHeaders(origin),
      });
    }

    // POST /api/generate
    if (url.pathname === "/api/generate" && request.method === "POST") {
      try {
        const body = (await request.json()) as Partial<GenerateRequestBody>;
        const { userId, message } = body;

        if (!userId || !message) {
          return errorResponse("userId and message are required", 400, origin);
        }

        // Get DO (optional for now)
        const id = env.USER_MEMORY.idFromName(userId);
        const stub = env.USER_MEMORY.get(id);
        const userProfile = await getUserProfile(stub);

        // Run simplified travel planner workflow
        const result = await executeWorkflow(env.AI, message);

        // OPTIONAL: If you want to still update memory, uncomment:
        // await updateUserProfile(stub, { ...userProfile });

        return jsonResponse(
          {
            plan: result.plan,  // <-- new response shape
            message: "Travel plan generated successfully!",
          },
          200,
          origin
        );
      } catch (err) {
        console.error("Error:", err);
        const message =
          err instanceof Error ? err.message : "Internal server error";
        return errorResponse(message, 500, origin);
      }
    }

    // GET /api/profile/:userId
    if (url.pathname.startsWith("/api/profile/") && request.method === "GET") {
      try {
        const userId = url.pathname.split("/").pop()!;
        const id = env.USER_MEMORY.idFromName(userId);
        const stub = env.USER_MEMORY.get(id);
        const profile = await getUserProfile(stub);

        return jsonResponse({ profile }, 200, origin);
      } catch (err) {
        console.error("Error:", err);
        const message =
          err instanceof Error ? err.message : "Internal server error";
        return errorResponse(message, 500, origin);
      }
    }

    return errorResponse("Not found", 404, origin);
  },
} satisfies ExportedHandler<Env>;
