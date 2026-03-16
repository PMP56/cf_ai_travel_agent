// worker/src/utils/extractDestination.ts

interface DestinationExtraction {
  destination: string | null;
}

const SYSTEM_PROMPT = `You are a travel destination extractor.
Given a user message, return ONLY a raw JSON object — no markdown, no backticks, no explanation.
Example outputs:
{"destination":"Tokyo"}
{"destination":"Japan"}
{"destination":null}

Rules:
- Extract the most specific location (prefer city over country)
- Normalize to common English ("Nippon" → "Japan")
- If no destination mentioned, set destination to null`;

export async function extractDestination(
  ai: Ai,
  userMessage: string
): Promise<DestinationExtraction> {
  const fallback: DestinationExtraction = {
    destination: null,
  };

  try {
    const result = await ai.run("@cf/meta/llama-3.3-70b-instruct-fp8-fast", {
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userMessage },
      ],
      max_tokens: 64,
      temperature: 0.1,
    }) as any;

    const raw = result?.response;

    let parsed: DestinationExtraction;

    if (typeof raw === "object" && raw !== null) {
      // Cloudflare already parsed the JSON into an object
      parsed = raw as DestinationExtraction;
    } else if (typeof raw === "string") {
      // Fallback: parse string, stripping any code fences
      const cleaned = raw
        .replace(/```json\s*/gi, "")
        .replace(/```\s*/g, "")
        .trim();
      parsed = JSON.parse(cleaned);
    } else {
      return fallback;
    }

    return {
      destination: parsed.destination ?? null,
    };
  } catch (err) {
    console.error("Destination extraction failed:", err);
    return fallback;
  }
}