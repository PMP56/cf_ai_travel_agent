export interface UnsplashPhoto {
  id: string;
  url: string;          // regular size
  thumb: string;        // thumbnail
  altDescription: string;
  photographer: string;
  photographerUrl: string;
}

export async function fetchDestinationPhotos(
  destination: string,
  accessKey: string,
  count = 4
): Promise<UnsplashPhoto[]> {
  const query = encodeURIComponent(`${destination} travel`);
  const res = await fetch(
    `https://api.unsplash.com/search/photos?query=${query}&per_page=${count}&orientation=landscape`,
    { headers: { Authorization: `Client-ID ${accessKey}` } }
  );

  if (!res.ok) return [];

  const data = await res.json() as any;
  return data.results.map((photo: any) => ({
    id: photo.id,
    url: photo.urls.regular,
    thumb: photo.urls.thumb,
    altDescription: photo.alt_description ?? destination,
    photographer: photo.user.name,
    photographerUrl: photo.user.links.html,
  }));
}