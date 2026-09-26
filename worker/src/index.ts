import {
  UserMemory,
  getUserProfile,
  updateUserProfile,
} from "./memory/UserMemory";
import { executeWorkflow, replaceHighlight } from "./workflow";
import { corsHeaders, jsonResponse, errorResponse } from "./utils/helpers";
import { runPipeline, PipelineEvent, PipelineInput } from "./pipeline";
import { TripBrief } from "./schema/trip";
import { ResolvedPlace } from "./tools/geocode";

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

    // POST /api/v2/brief — the full pipeline, one JSON response
    if (url.pathname === "/api/v2/brief" && request.method === "POST") {
      try {
        const body = (await request.json()) as { message?: string };
        const message = body?.message;

        if (!message || typeof message !== "string" || !message.trim()) {
          return errorResponse("message is required", 400, origin);
        }

        const result = await runPipeline(env.AI, { kind: "message", message });
        return jsonResponse(result, 200, origin);
      } catch (err) {
        console.error("Error:", err);
        return errorResponse("Failed to build trip brief", 500, origin);
      }
    }

    // POST /api/v2/stream — same pipeline, progress as Server-Sent Events.
    //
    // SSE rather than WebSockets: progress is strictly one-way, so a socket
    // would add a Durable Object and a connection lifecycle for nothing. This
    // is a plain streamed response, and EventSource reconnects on its own.
    if (url.pathname === "/api/v2/stream" && request.method === "POST") {
      let input: PipelineInput;
      try {
        const body = (await request.json()) as {
          message?: string;
          brief?: TripBrief;
          place?: ResolvedPlace | null;
        };

        if (body?.brief && typeof body.brief?.destination === "string") {
          // Re-plan from an edited brief: skips intake entirely.
          input = { kind: "brief", brief: body.brief, place: body.place ?? null };
        } else if (typeof body?.message === "string" && body.message.trim()) {
          input = { kind: "message", message: body.message };
        } else {
          return errorResponse("message or brief is required", 400, origin);
        }
      } catch {
        return errorResponse("invalid JSON body", 400, origin);
      }

      const encoder = new TextEncoder();
      const { readable, writable } = new TransformStream();
      const writer = writable.getWriter();

      const send = (event: PipelineEvent) => {
        // Fire-and-forget: a client that has hung up must not break the run.
        writer
          .write(encoder.encode(`data: ${JSON.stringify(event)}\n\n`))
          .catch(() => {});
      };

      // Run detached so the response streams immediately.
      (async () => {
        try {
          const result = await runPipeline(env.AI, input, send);
          send({ type: "complete", result });
        } catch (err) {
          console.error("Pipeline error:", err);
          send({
            type: "error",
            message: err instanceof Error ? err.message : "Pipeline failed",
          });
        } finally {
          await writer.close().catch(() => {});
        }
      })();

      return new Response(readable, {
        status: 200,
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
          ...corsHeaders(origin),
        },
      });
    }

    return errorResponse("Not found", 404, origin);
  },
} satisfies ExportedHandler<Env>;
