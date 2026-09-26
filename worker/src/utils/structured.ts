import { parseAiJson } from "./aiJson";

/**
 * One structured call to Workers AI, constrained by a JSON Schema.
 *
 * `response_format: {type: "json_schema"}` is supported on a short list of
 * Workers AI models — llama-3.3-70b-instruct-fp8-fast among them. It makes the
 * model emit schema-shaped output rather than being asked nicely for it, which
 * is what lets v2 drop most of v1's hand-rolled field validation.
 *
 * Cloudflare does not *guarantee* compliance, so this still normalises the
 * result through `parseAiJson` — the response can come back as an object or as
 * a JSON string, and on a complex schema it can fail outright.
 */

export const STRUCTURED_MODEL = "@cf/meta/llama-3.3-70b-instruct-fp8-fast";

export interface StructuredCallOptions {
  system: string;
  user: string;
  schema: unknown;
  /** Label used in error messages, e.g. "intake". */
  context: string;
  maxTokens?: number;
  model?: string;
}

export async function runStructured(
  ai: Ai,
  { system, user, schema, context, maxTokens = 1024, model = STRUCTURED_MODEL }: StructuredCallOptions
): Promise<any> {
  const response = await ai.run(model as any, {
    max_tokens: maxTokens,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    response_format: {
      type: "json_schema",
      json_schema: schema,
    },
  } as any);

  const raw = (response as any)?.response;
  if (raw === undefined || raw === null) {
    throw new Error(`${context}: model returned no response`);
  }

  // JSON Mode usually yields an object; a string still arrives when the
  // schema could not be met and the model fell back to free-form text.
  return parseAiJson(raw, context);
}
