export interface AIResponse {
  response: string;
}

export async function callLlama(
  ai: Ai,
  systemPrompt: string,
  userPrompt: string
): Promise<string> {
  const raw: unknown = await ai.run("@cf/meta/llama-3.3-70b-instruct-fp8-fast", {
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.7,
    max_tokens: 2048,
  });

  // Case 0: raw is already a string
  if (typeof raw === "string") {
    return raw;
  }

  // If it's null/undefined or not an object, bail out
  if (!raw || typeof raw !== "object") {
    return "";
  }

  // From here on, work with 'any' so TS stops complaining about properties
  const r: any = raw;

  // Case 1: Standard Workers AI output
  if (typeof r.response === "string") {
    return r.response;
  }

  // Case 2: output_text-style
  if (typeof r.output_text === "string") {
    return r.output_text;
  }

  // Case 3: result-style
  if (typeof r.result === "string") {
    return r.result;
  }

  // Case 4: OpenAI-style choices
  if (
    Array.isArray(r.choices) &&
    r.choices[0] &&
    r.choices[0].message &&
    typeof r.choices[0].message.content === "string"
  ) {
    return r.choices[0].message.content;
  }

  // Case 5: nested output.text
  if (r.output && typeof r.output.text === "string") {
    return r.output.text;
  }

  // Fallback: stringify whatever it is
  return JSON.stringify(raw);
}

export async function callLlamaJSON(
  ai: Ai,
  systemPrompt: string,
  userPrompt: string,
  schema: any
): Promise<any> {
  const result = await ai.run("@cf/meta/llama-3.3-70b-instruct-fp8-fast", {
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "Response",
        schema
      }
    },
    max_tokens: 2048,
    temperature: 0.7,
  });

  // Cloudflare returns JSON already parsed
  if (typeof result === "object") {
    return result;
  }

  throw new Error("AI did not return JSON schema output");
}
