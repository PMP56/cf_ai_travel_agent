import { UserMemory } from "./memory/UserMemory";
import { corsHeaders, jsonResponse, errorResponse } from "./utils/helpers";
import { checkRateLimit, clientKey, PLAN_LIMIT } from "./utils/rateLimit";
import { runPipeline, PipelineEvent, PipelineInput } from "./pipeline";
import { TripBrief } from "./schema/trip";
import { ResolvedPlace } from "./tools/geocode";

/**
 * Still exported because wrangler.toml binds it and removing a Durable Object
 * class requires a migration. Nothing reads it yet: v2's pipeline is stateless,
 * so the per-user memory v1 had is currently a feature regression rather than a
 * deliberate omission. See docs/PROGRESS.md.
 */
export { UserMemory };

interface Env {
  AI: Ai;
  USER_MEMORY: DurableObjectNamespace;
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

    // Planning is seven model calls, so both plan routes share one budget.
    const isPlanRoute =
      request.method === "POST" &&
      (url.pathname === "/api/v2/brief" ||
        url.pathname === "/api/v2/stream");

    if (isPlanRoute) {
      const verdict = checkRateLimit(clientKey(request), PLAN_LIMIT);
      if (!verdict.allowed) {
        return new Response(
          JSON.stringify({
            error: `Too many plans. Try again in ${verdict.retryAfterSeconds}s.`,
          }),
          {
            status: 429,
            headers: {
              "Content-Type": "application/json",
              "Retry-After": String(verdict.retryAfterSeconds),
              ...corsHeaders(origin),
            },
          }
        );
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
