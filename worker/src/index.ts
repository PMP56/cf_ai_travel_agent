import {
  UserMemory,
  getUserProfile,
  updateUserProfile,
} from "./memory/UserMemory";
import { executeWorkflow, replaceHighlight } from "./workflow";
import { corsHeaders, jsonResponse, errorResponse } from "./utils/helpers";
import { runIntake } from "./agents/intake";
import { runClimateAgent } from "./agents/climate";
import { runPlacesAgent } from "./agents/places";
import { runDestinationAgent } from "./agents/destination";
import { missingBriefFields } from "./schema/trip";

export { UserMemory };

interface Env {
  AI: Ai;
  USER_MEMORY: DurableObjectNamespace;
  UNSPLASH_ACCESS_KEY?: string;
}

interface GenerateRequestBody {
  userId: string;
  message: string;
}

interface ReplaceHighlightRequestBody {
  userId: string;
  destination: string;
  day: string;
  currentTitle: string;
  allHighlights: { title: string; date: string }[];
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
      return new Response("AI Travel Agent Worker is running!", {
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

        // Load this user's remembered preferences
        const id = env.USER_MEMORY.idFromName(userId);
        const stub = env.USER_MEMORY.get(id);
        const userProfile = await getUserProfile(stub);

        // Run simplified travel planner workflow
        const { plan, photos, updatedProfile } = await executeWorkflow(
          env.AI,
          message,
          userProfile,
          env.UNSPLASH_ACCESS_KEY
        );

        await updateUserProfile(stub, updatedProfile);

        return jsonResponse(
          {
            plan: plan,
            photos,
            message: "Travel plan generated successfully!",
          },
          200,
          origin
        );
      } catch (err) {
        console.error("Error:", err);
        return errorResponse("Failed to generate a travel plan", 500, origin);
      }
    }

    // POST /api/replace-highlight
    if (url.pathname === "/api/replace-highlight" && request.method === "POST") {
      try {
        const body = (await request.json()) as Partial<ReplaceHighlightRequestBody>;
        const { destination, day, currentTitle, allHighlights } = body;

        if (!destination || !day || !currentTitle || !allHighlights) {
          return errorResponse("destination, day, currentTitle and allHighlights are required", 400, origin);
        }

        const highlight = await replaceHighlight(env.AI, {
          destination,
          day,
          currentTitle,
          allHighlights,
        });

        return jsonResponse({ highlight }, 200, origin);
      } catch (err) {
        console.error("Error:", err);
        return errorResponse("Failed to find a replacement activity", 500, origin);
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
        return errorResponse("Failed to load profile", 500, origin);
      }
    }

    // POST /api/v2/brief — v2 pipeline (Phase 0: intake + climate)
    if (url.pathname === "/api/v2/brief" && request.method === "POST") {
      try {
        const body = (await request.json()) as { message?: string };
        const message = body?.message;

        if (!message || typeof message !== "string" || !message.trim()) {
          return errorResponse("message is required", 400, origin);
        }

        const { brief, place, alternatives } = await runIntake(env.AI, message);

        // Specialists are independent and grounded — fan them out. Each
        // catches its own failure: no specialist may take down the brief.
        const [climate, places, destination] = await Promise.all([
          place
            ? runClimateAgent(env.AI, brief, place).catch((err) => {
                console.error("Climate agent failed:", err);
                return null;
              })
            : Promise.resolve(null),
          place
            ? runPlacesAgent(env.AI, brief, place).catch((err) => {
                console.error("Places agent failed:", err);
                return [];
              })
            : Promise.resolve([]),
          // Destination needs no geocode — it works from the name alone.
          runDestinationAgent(env.AI, brief).catch((err) => {
            console.error("Destination agent failed:", err);
            return null;
          }),
        ]);

        return jsonResponse(
          {
            brief,
            place,
            alternatives,
            destination,
            climate,
            places,
            missing: missingBriefFields(brief),
          },
          200,
          origin
        );
      } catch (err) {
        console.error("Error:", err);
        return errorResponse("Failed to build trip brief", 500, origin);
      }
    }

    return errorResponse("Not found", 404, origin);
  },
} satisfies ExportedHandler<Env>;
