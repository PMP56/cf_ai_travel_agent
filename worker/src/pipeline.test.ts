import { describe, it, expect } from "vitest";
import { explainFailure } from "./pipeline";

/**
 * The free Workers AI tier covers roughly seven plans a day, so an exhausted
 * quota is the failure this project hits most. Reporting it as "could not
 * understand the request" sent people off rewriting a perfectly good sentence.
 */
describe("explainFailure", () => {
  it("names an exhausted Workers AI allowance and says when it resets", () => {
    const msg = explainFailure(
      new Error("4006: you have used up your daily free allocation of 10,000 neurons")
    );
    expect(msg).toMatch(/free tier/i);
    expect(msg).toMatch(/00:00 UTC/);
    expect(msg).not.toMatch(/understand/i);
  });

  it("matches the wording even without the numeric code", () => {
    expect(explainFailure(new Error("daily free allocation exceeded"))).toMatch(/free tier/i);
  });

  it("distinguishes rate limiting from quota", () => {
    expect(explainFailure(new Error("Server responded 429"))).toMatch(/rate limited/i);
  });

  it("reports timeouts as transient", () => {
    expect(explainFailure(new Error("The operation timed out"))).toMatch(/too long/i);
  });

  it("passes an unknown cause through rather than hiding it", () => {
    expect(explainFailure(new Error("socket hang up"))).toContain("socket hang up");
  });

  it("handles a non-Error throw", () => {
    expect(explainFailure("boom")).toContain("boom");
  });
});
