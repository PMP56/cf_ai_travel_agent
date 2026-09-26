import { describe, it, expect, beforeEach } from "vitest";
import { checkRateLimit, clientKey, resetRateLimits } from "./rateLimit";

const config = { limit: 3, windowMs: 1000 };

describe("checkRateLimit", () => {
  beforeEach(resetRateLimits);

  it("allows up to the limit then refuses", () => {
    for (let i = 0; i < 3; i++) expect(checkRateLimit("a", config).allowed).toBe(true);
    expect(checkRateLimit("a", config).allowed).toBe(false);
  });

  it("counts down the remaining allowance", () => {
    expect(checkRateLimit("a", config).remaining).toBe(2);
    expect(checkRateLimit("a", config).remaining).toBe(1);
    expect(checkRateLimit("a", config).remaining).toBe(0);
  });

  it("keeps callers independent", () => {
    for (let i = 0; i < 3; i++) checkRateLimit("a", config);
    expect(checkRateLimit("a", config).allowed).toBe(false);
    expect(checkRateLimit("b", config).allowed).toBe(true);
  });

  it("suggests a positive retry delay when refusing", () => {
    for (let i = 0; i < 3; i++) checkRateLimit("a", config);
    const verdict = checkRateLimit("a", config);
    expect(verdict.retryAfterSeconds).toBeGreaterThan(0);
    expect(verdict.retryAfterSeconds).toBeLessThanOrEqual(1);
  });

  it("reopens once the window has passed", async () => {
    const quick = { limit: 1, windowMs: 40 };
    expect(checkRateLimit("a", quick).allowed).toBe(true);
    expect(checkRateLimit("a", quick).allowed).toBe(false);
    await new Promise((r) => setTimeout(r, 60));
    expect(checkRateLimit("a", quick).allowed).toBe(true);
  });
});

describe("clientKey", () => {
  it("prefers the edge-set header, which a client cannot forge", () => {
    const req = new Request("https://x.dev", {
      headers: { "CF-Connecting-IP": "1.2.3.4", "X-Forwarded-For": "9.9.9.9" },
    });
    expect(clientKey(req)).toBe("1.2.3.4");
  });

  it("falls back to the first forwarded address", () => {
    const req = new Request("https://x.dev", {
      headers: { "X-Forwarded-For": "5.6.7.8, 9.9.9.9" },
    });
    expect(clientKey(req)).toBe("5.6.7.8");
  });

  it("has a stable fallback for local dev", () => {
    expect(clientKey(new Request("https://x.dev"))).toBe("local");
  });
});
