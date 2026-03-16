import type { UnsplashPhoto } from "../types";

export default function PhotoStrip({ photos }: { photos: UnsplashPhoto[] }) {
  if (!photos.length) return null;

  return (
    <div className="mt-3 mb-1">
      <div className="flex gap-2 overflow-x-auto pb-1">
        {photos.map((photo) => (
          <a
            key={photo.id}
            href={photo.photographerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-shrink-0 relative group"
          >
            <img
              src={photo.thumb}
              alt={photo.altDescription}
              className="h-32 w-47 object-cover rounded-xl border border-gray-200
                         group-hover:opacity-90 transition-opacity"
            />
            <span
              className="absolute bottom-1 right-1 text-[10px] text-white
                         bg-black/50 px-1.5 py-0.5 rounded opacity-0 
                         group-hover:opacity-100 transition-opacity"
            >
              {photo.photographer}
            </span>
          </a>
        ))}
      </div>
      {/* <p className="text-xs text-gray-400 mt-1">📷 Photos via Unsplash</p> */}
    </div>
  );
}