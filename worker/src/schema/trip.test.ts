import { describe, it, expect } from "vitest";
import { normalizeTripBrief, missingBriefFields, TRIP_BRIEF_JSON_SCHEMA } from "./trip";

/**
 * The model returns a flat, sentinel-laden object because Workers AI does not
 * guarantee JSON Mode compliance on nested schemas. Normalisation is where
 * those sentinels become honest nulls, and getting it wrong means either
 * inventing constraints the traveller never stated or discarding ones they did.
 */

const raw = (over: Record<string, unknown> = {}) => ({
  destination: "Kyoto",
  destinationCity: "Kyoto",
  durationDays: 7,
  travelMonth: "April",
  budgetAmount: 2000,
  budgetCurrency: "usd",
  partySize: 2,
  pace: "relaxed",
  interests: ["temples"],
  constraints: ["vegetarian"],
  ...over,
});

describe("normalizeTripBrief", () => {
  it("reads a complete brief", () => {
    const brief = normalizeTripBrief(raw());
    expect(brief.destination).toBe("Kyoto");
    expect(brief.durationDays).toBe(7);
    expect(brief.travelMonth).toBe("April");
    expect(brief.budget).toEqual({ amount: 2000, currency: "USD" });
    expect(brief.partySize).toBe(2);
    expect(brief.pace).toBe("relaxed");
    expect(brief.interests).toEqual(["temples"]);
    expect(brief.constraints).toEqual(["vegetarian"]);
  });

  it("turns sentinels into nulls rather than inventing values", () => {
    const brief = normalizeTripBrief(
      raw({ durationDays: 0, travelMonth: "", budgetAmount: 0, partySize: 0, pace: "" })
    );
    expect(brief.durationDays).toBeNull();
    expect(brief.travelMonth).toBeNull();
    expect(brief.budget).toBeNull();
    expect(brief.partySize).toBeNull();
    expect(brief.pace).toBeNull();
  });

  it("drops destinationCity when it just repeats the destination", () => {
    expect(normalizeTripBrief(raw({ destinationCity: "kyoto" })).destinationCity).toBeNull();
  });

  it("keeps destinationCity when it is a real gateway anchor", () => {
    const brief = normalizeTripBrief(
      raw({ destination: "Patagonia", destinationCity: "El Calafate" })
    );
    expect(brief.destinationCity).toBe("El Calafate");
  });

  it("normalises month casing and rejects nonsense months", () => {
    expect(normalizeTripBrief(raw({ travelMonth: "aPRIL" })).travelMonth).toBe("April");
    expect(normalizeTripBrief(raw({ travelMonth: "Smarch" })).travelMonth).toBeNull();
  });

  it("rejects a pace outside the allowed set", () => {
    expect(normalizeTripBrief(raw({ pace: "frantic" })).pace).toBeNull();
  });

  it("clamps implausible numbers instead of trusting them", () => {
    expect(normalizeTripBrief(raw({ durationDays: 9999 })).durationDays).toBe(60);
    expect(normalizeTripBrief(raw({ partySize: 500 })).partySize).toBe(20);
  });

  it("discards non-string entries in the string arrays", () => {
    const brief = normalizeTripBrief(raw({ interests: ["temples", 42, "", null, "  food  "] }));
    expect(brief.interests).toEqual(["temples", "food"]);
  });

  it("survives arrays arriving as something else entirely", () => {
    const brief = normalizeTripBrief(raw({ interests: "temples", constraints: null }));
    expect(brief.interests).toEqual([]);
    expect(brief.constraints).toEqual([]);
  });

  it("throws only when the destination is unusable", () => {
    expect(() => normalizeTripBrief(raw({ destination: "" }))).toThrow();
    expect(() => normalizeTripBrief(raw({ destination: 42 }))).toThrow();
    expect(() => normalizeTripBrief(null)).toThrow();
  });
});

describe("missingBriefFields", () => {
  it("reports nothing when the brief is complete", () => {
    expect(missingBriefFields(normalizeTripBrief(raw()))).toEqual([]);
  });

  it("names each unstated field", () => {
    const brief = normalizeTripBrief(raw({ durationDays: 0, budgetAmount: 0 }));
    expect(missingBriefFields(brief)).toEqual(["durationDays", "budget"]);
  });
});

describe("TRIP_BRIEF_JSON_SCHEMA", () => {
  it("requires every property it declares", () => {
    // A field present in properties but absent from required can silently come
    // back missing, which is how the destinationCity anchor would regress.
    const props = Object.keys(TRIP_BRIEF_JSON_SCHEMA.properties);
    expect([...TRIP_BRIEF_JSON_SCHEMA.required].sort()).toEqual(props.sort());
  });

  it("stays flat — no nested objects, which JSON Mode handles poorly", () => {
    for (const spec of Object.values(TRIP_BRIEF_JSON_SCHEMA.properties)) {
      expect(["string", "number", "array"]).toContain((spec as { type: string }).type);
    }
  });
});
