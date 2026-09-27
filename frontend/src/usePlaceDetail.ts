import { useEffect, useState } from "react";

/**
 * Richer detail for one place, fetched from Wikipedia on demand.
 *
 * Deliberately client-side and direct. Wikipedia serves `Access-Control-Allow-
 * Origin: *`, so routing this through the worker would add latency, a hop and
 * rate-limit pressure to buy nothing — and critically it would spend no Workers
 * AI quota either way, because no model is involved. Opening the detail panel
 * therefore costs nothing against the seven-plans-a-day ceiling.
 *
 * Two endpoints, because neither alone is enough:
 *  - the action API for the full intro extract (the pipeline truncates to two
 *    sentences to keep prompt tokens down; here we want the whole thing)
 *  - the REST media-list for a gallery. `prop=images` on the action API returns
 *    every file on the page — Commons logos, flag icons, location maps, even an
 *    unrelated photo of a French garden — whereas media-list returns only what
 *    the article actually displays, in order, with captions.
 */

const ACTION_API = "https://en.wikipedia.org/w/api.php";
const REST_API = "https://en.wikipedia.org/api/rest_v1/page";
const TIMEOUT_MS = 8000;
const MAX_IMAGES = 8;

export interface PlaceImage {
  src: string;
  caption: string | null;
  title: string;
}

export interface PlaceDetail {
  extract: string;
  images: PlaceImage[];
}

export type DetailStatus = "idle" | "loading" | "ready" | "error";

/** Title -> detail. Survives switching between places within a session. */
const cache = new Map<string, PlaceDetail>();

async function fetchExtract(title: string): Promise<string> {
  const params = new URLSearchParams({
    action: "query",
    prop: "extracts",
    exintro: "1",
    explaintext: "1",
    titles: title,
    format: "json",
    formatversion: "2",
    origin: "*",
  });

  const res = await fetch(`${ACTION_API}?${params}`, {
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`Wikipedia returned ${res.status}`);

  const data = (await res.json()) as { query?: { pages?: { extract?: string }[] } };
  const extract = data?.query?.pages?.[0]?.extract;
  return typeof extract === "string" ? extract.trim() : "";
}

async function fetchImages(title: string): Promise<PlaceImage[]> {
  const res = await fetch(`${REST_API}/media-list/${encodeURIComponent(title)}`, {
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) return [];

  const data = (await res.json()) as { items?: unknown[] };
  if (!Array.isArray(data.items)) return [];

  const images: PlaceImage[] = [];

  for (const raw of data.items) {
    const item = raw as {
      type?: string;
      showInGallery?: boolean;
      title?: string;
      caption?: { text?: string };
      srcset?: { src?: string }[];
    };

    // showInGallery is the flag that separates article imagery from chrome.
    if (item.type !== "image" || !item.showInGallery) continue;

    const src = item.srcset?.[0]?.src;
    if (typeof src !== "string") continue;

    images.push({
      // srcset entries are protocol-relative.
      src: src.startsWith("//") ? `https:${src}` : src,
      caption: item.caption?.text?.trim() || null,
      title: (item.title ?? "").replace(/^File:/, "").replace(/_/g, " "),
    });

    if (images.length >= MAX_IMAGES) break;
  }

  return images;
}

/**
 * Loads detail for `title`, or nothing when it is null. A failure leaves the
 * panel showing the facts the pipeline already produced rather than an error —
 * the extra detail is enrichment, not the substance of the page.
 */
export function usePlaceDetail(title: string | null) {
  // Keyed by title rather than reset in an effect. Deriving from the loaded key
  // means switching places shows "loading" immediately on the render that
  // changes it, with no extra pass and no setState inside an effect.
  const [loaded, setLoaded] = useState<{
    title: string;
    status: Exclude<DetailStatus, "idle" | "loading">;
    detail: PlaceDetail | null;
  } | null>(null);

  useEffect(() => {
    if (!title || cache.has(title)) return;

    let cancelled = false;

    (async () => {
      // Independent; a missing gallery must not cost us the extract.
      const [extract, images] = await Promise.all([
        fetchExtract(title).catch(() => ""),
        fetchImages(title).catch(() => [] as PlaceImage[]),
      ]);

      if (cancelled) return;

      if (!extract && images.length === 0) {
        setLoaded({ title, status: "error", detail: null });
        return;
      }

      const result = { extract, images };
      cache.set(title, result);
      setLoaded({ title, status: "ready", detail: result });
    })();

    return () => {
      cancelled = true;
    };
  }, [title]);

  if (!title) return { status: "idle" as DetailStatus, detail: null };

  const cached = cache.get(title);
  if (cached) return { status: "ready" as DetailStatus, detail: cached };

  if (loaded?.title === title) {
    return { status: loaded.status as DetailStatus, detail: loaded.detail };
  }

  return { status: "loading" as DetailStatus, detail: null };
}
