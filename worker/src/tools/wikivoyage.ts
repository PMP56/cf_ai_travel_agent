/**
 * Destination prose from Wikivoyage — keyless, human-written travel guides for
 * 30,000+ places.
 *
 * Uses plain-text extracts rather than wikitext. The raw markup is inconsistent
 * between articles (`{{listing}}` vs `{{see}}`, large cities pushing content to
 * district subpages) and parsing it reliably is not worth it; `explaintext`
 * hands back clean prose with section headers intact.
 *
 * No LLM involved.
 */

const WIKIVOYAGE_API = "https://en.wikivoyage.org/w/api.php";
const USER_AGENT = "ai-travel-agent/0.2 (https://travel-agent-111.pages.dev/)";
const TIMEOUT_MS = 10000;

/** Sections worth spending prompt tokens on, in priority order. */
export const USEFUL_SECTIONS = [
  "Understand",
  "Get around",
  "Stay safe",
  "Respect",
  "Eat",
  "Drink",
  "Buy",
] as const;

export interface DestinationGuide {
  title: string;
  url: string;
  /** Section name -> plain text, truncated. Only sections that exist. */
  sections: Record<string, string>;
}

async function wikivoyageCall(params: Record<string, string>): Promise<any> {
  const body = new URLSearchParams({ format: "json", formatversion: "2", ...params });

  const res = await fetch(WIKIVOYAGE_API, {
    method: "POST",
    headers: {
      "User-Agent": USER_AGENT,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });

  if (!res.ok) throw new Error(`Wikivoyage returned ${res.status}`);

  const data = await res.json();
  if ((data as any)?.error) {
    throw new Error(`Wikivoyage error: ${(data as any).error.info ?? "unknown"}`);
  }
  return data;
}

/**
 * Split a plain-text article into its sections. Headers survive `explaintext`
 * as `== Name ==` / `=== Name ===`; only top-level ones start a new section, so
 * subsection prose stays attached to its parent.
 */
function splitSections(text: string): Record<string, string> {
  const sections: Record<string, string> = {};
  const lines = text.split("\n");

  let current = "Intro";
  let buffer: string[] = [];

  const flush = () => {
    const body = buffer.join("\n").trim();
    if (body) sections[current] = (sections[current] ? sections[current] + "\n" : "") + body;
    buffer = [];
  };

  for (const line of lines) {
    const topLevel = /^==\s*([^=].*?)\s*==$/.exec(line.trim());
    if (topLevel) {
      flush();
      current = topLevel[1];
      continue;
    }
    // Keep subsection headers as inline context rather than starting a section.
    const sub = /^={3,}\s*([^=].*?)\s*={3,}$/.exec(line.trim());
    buffer.push(sub ? `${sub[1]}:` : line);
  }
  flush();

  return sections;
}

/** Find the Wikivoyage article that best matches a destination name. */
async function resolveTitle(name: string): Promise<string | null> {
  const data = await wikivoyageCall({
    action: "query",
    list: "search",
    srsearch: name,
    srlimit: "1",
    srnamespace: "0",
  });

  const hit = data?.query?.search?.[0];
  return typeof hit?.title === "string" ? hit.title : null;
}

export interface GuideOptions {
  /** Characters kept per section. Directly controls prompt size. */
  maxSectionChars?: number;
}

/**
 * Returns null when no article matches. Callers plan without destination prose
 * rather than failing — this is enrichment.
 */
export async function getDestinationGuide(
  name: string,
  { maxSectionChars = 1200 }: GuideOptions = {}
): Promise<DestinationGuide | null> {
  const title = await resolveTitle(name);
  if (!title) return null;

  const data = await wikivoyageCall({
    action: "query",
    prop: "extracts",
    explaintext: "1",
    titles: title,
  });

  const page = data?.query?.pages?.[0];
  const extract = page?.extract;
  if (typeof extract !== "string" || extract.length === 0) return null;

  const all = splitSections(extract);
  const sections: Record<string, string> = {};

  // The lead paragraph has no header and is the best one-line summary.
  if (all.Intro) sections.Intro = all.Intro.slice(0, maxSectionChars);

  for (const wanted of USEFUL_SECTIONS) {
    const body = all[wanted];
    if (body) {
      const cleaned = body.replace(/\n{3,}/g, "\n\n").trim();
      if (cleaned.length > 40) sections[wanted] = cleaned.slice(0, maxSectionChars);
    }
  }

  if (Object.keys(sections).length === 0) return null;

  return {
    title: page.title ?? title,
    url: `https://en.wikivoyage.org/wiki/${encodeURIComponent(String(page.title ?? title).replace(/ /g, "_"))}`,
    sections,
  };
}
