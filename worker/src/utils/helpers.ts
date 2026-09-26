/**
 * CORS and response helpers.
 *
 * The origin allowlist replaces reflecting whatever `Origin` arrives, which
 * let any site on the internet call this worker from a logged-in browser. With
 * no auth that is low-stakes today, but it also means any page could burn the
 * Workers AI quota, and it becomes a real hole the moment identity exists.
 */

const ALLOWED_ORIGINS = new Set([
  "https://travel-agent-111.pages.dev",
  "http://localhost:5173",
  "http://localhost:4173",
  "http://127.0.0.1:5173",
]);

/** Cloudflare Pages preview builds get a generated subdomain per deployment. */
const PREVIEW_PATTERN = /^https:\/\/[a-z0-9-]+\.travel-agent-111\.pages\.dev$/;

export function isAllowedOrigin(origin: string | undefined): boolean {
  if (!origin) return false;
  return ALLOWED_ORIGINS.has(origin) || PREVIEW_PATTERN.test(origin);
}

/**
 * An unrecognised origin gets no CORS headers at all, so the browser blocks the
 * response. Non-browser callers (curl, a server) send no Origin and are
 * unaffected — CORS was never a server-side access control.
 */
export function corsHeaders(origin?: string): Record<string, string> {
  if (!isAllowedOrigin(origin)) return {};

  return {
    "Access-Control-Allow-Origin": origin as string,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    // Caches must not serve one origin's response to another.
    Vary: "Origin",
  };
}

export function jsonResponse(data: unknown, status = 200, origin?: string): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders(origin),
    },
  });
}

export function errorResponse(message: string, status = 500, origin?: string): Response {
  return jsonResponse({ error: message }, status, origin);
}
