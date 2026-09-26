/**
 * Workers AI returns either an already-parsed object or a string that may be
 * wrapped in markdown fences despite the prompt asking for raw JSON.
 * Normalising that is identical for every call site, so it lives here.
 */
export function parseAiJson(raw: unknown, context: string): any {
  if (typeof raw === "object" && raw !== null) return raw;

  if (typeof raw === "string") {
    const cleaned = raw
      .replace(/```json\s*/gi, "")
      .replace(/```\s*/g, "")
      .trim();
    try {
      return JSON.parse(cleaned);
    } catch {
      throw new Error(`${context}: model did not return valid JSON`);
    }
  }

  throw new Error(`${context}: unexpected response format from AI`);
}
