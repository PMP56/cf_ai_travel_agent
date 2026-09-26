export interface UnsplashPhoto {
  id: string;
  url: string;          // regular size
  thumb: string;        // thumbnail
  altDescription: string;
  photographer: string;
  photographerUrl: string;
}

const UNSPLASH_TIMEOUT_MS = 5000;

export async function fetchDestinationPhotos(
  destination: string,
  accessKey: string,
  count = 6
): Promise<UnsplashPhoto[]> {
  const query = encodeURIComponent(`${destination} travel`);

  // Photos are enrichment — never let a slow Unsplash hold up a finished plan.
  const res = await fetch(
    `https://api.unsplash.com/search/photos?query=${query}&per_page=${count}&orientation=landscape`,
    {
      headers: { Authorization: `Client-ID ${accessKey}` },
      signal: AbortSignal.timeout(UNSPLASH_TIMEOUT_MS),
    }
  );

  if (!res.ok) return [];

  const data = (await res.json()) as any;
  if (!Array.isArray(data?.results)) return [];

  return data.results.flatMap((photo: any): UnsplashPhoto[] => {
    const url = photo?.urls?.regular;
    if (typeof photo?.id !== "string" || typeof url !== "string") return [];
    return [
      {
        id: photo.id,
        url,
        thumb: photo.urls.thumb ?? url,
        altDescription: photo.alt_description ?? destination,
        photographer: photo.user?.name ?? "Unknown",
        photographerUrl: photo.user?.links?.html ?? "https://unsplash.com",
      },
    ];
  });
}
