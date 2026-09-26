import { describe, it, expect } from "vitest";
import { corsHeaders, isAllowedOrigin, errorResponse } from "./helpers";

describe("isAllowedOrigin", () => {
  it("accepts the production site and local dev", () => {
    expect(isAllowedOrigin("https://travel-agent-111.pages.dev")).toBe(true);
    expect(isAllowedOrigin("http://localhost:5173")).toBe(true);
  });

  it("accepts Pages preview deployments", () => {
    expect(isAllowedOrigin("https://abc123.travel-agent-111.pages.dev")).toBe(true);
  });

  it("rejects everything else, including lookalikes", () => {
    expect(isAllowedOrigin("https://evil.example")).toBe(false);
    // The previous implementation reflected any origin, so these all passed.
    expect(isAllowedOrigin("https://travel-agent-111.pages.dev.evil.com")).toBe(false);
    expect(isAllowedOrigin("http://travel-agent-111.pages.dev")).toBe(false);
    expect(isAllowedOrigin(undefined)).toBe(false);
  });
});

describe("corsHeaders", () => {
  it("emits nothing for a disallowed origin, so the browser blocks it", () => {
    expect(corsHeaders("https://evil.example")).toEqual({});
  });

  it("echoes an allowed origin and varies on it", () => {
    const headers = corsHeaders("http://localhost:5173");
    expect(headers["Access-Control-Allow-Origin"]).toBe("http://localhost:5173");
    expect(headers.Vary).toBe("Origin");
  });

  it("never emits a wildcard", () => {
    for (const origin of [undefined, "https://evil.example", "http://localhost:5173"]) {
      expect(Object.values(corsHeaders(origin))).not.toContain("*");
    }
  });
});

describe("errorResponse", () => {
  it("returns the status and a JSON body", async () => {
    const res = errorResponse("nope", 400, "http://localhost:5173");
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "nope" });
  });
});
