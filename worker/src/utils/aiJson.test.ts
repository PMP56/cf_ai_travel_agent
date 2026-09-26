import { describe, it, expect } from "vitest";
import { parseAiJson } from "./aiJson";

/**
 * Workers AI does not guarantee JSON Mode compliance, so every structured call
 * still passes through here. These are the shapes actually observed in the wild.
 */
describe("parseAiJson", () => {
  it("passes an already-parsed object straight through", () => {
    const obj = { destination: "Kyoto" };
    expect(parseAiJson(obj, "test")).toBe(obj);
  });

  it("parses a plain JSON string", () => {
    expect(parseAiJson('{"a":1}', "test")).toEqual({ a: 1 });
  });

  it("strips the markdown fences models add despite being told not to", () => {
    expect(parseAiJson('```json\n{"a":1}\n```', "test")).toEqual({ a: 1 });
    expect(parseAiJson('```\n{"a":1}\n```', "test")).toEqual({ a: 1 });
    expect(parseAiJson('```JSON\n{"a":1}```', "test")).toEqual({ a: 1 });
  });

  it("handles surrounding whitespace", () => {
    expect(parseAiJson('\n\n  {"a":1}  \n', "test")).toEqual({ a: 1 });
  });

  it("names the caller in its error, so a failure is traceable", () => {
    expect(() => parseAiJson("not json at all", "climate")).toThrow(/climate/);
    expect(() => parseAiJson(42, "places")).toThrow(/places/);
    expect(() => parseAiJson(undefined, "food")).toThrow(/food/);
  });

  it("treats null as unusable rather than as an object", () => {
    expect(() => parseAiJson(null, "test")).toThrow();
  });

  it("accepts arrays, which are valid JSON responses", () => {
    expect(parseAiJson("[1,2]", "test")).toEqual([1, 2]);
  });
});
