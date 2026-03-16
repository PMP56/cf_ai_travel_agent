import { motion } from "framer-motion";
import type { UnsplashPhoto } from "../types";

interface PhotoGalleryProps {
  photos: UnsplashPhoto[];
}

export default function PhotoGallery({ photos }: PhotoGalleryProps) {
  return (
    <div className="p-5">
      <header className="mb-5 pb-4 border-b border-[rgba(0,0,0,0.06)]">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Visual Inspiration
        </p>
        <p className="text-sm text-muted-foreground mt-0.5">
          {photos.length} {photos.length === 1 ? "photo" : "photos"}
        </p>
      </header>

      <div className="grid grid-cols-2 gap-3">
        {photos.map((photo, i) => (
          <motion.a
            key={photo.id}
            href={photo.photographerUrl}
            target="_blank"
            rel="noopener noreferrer"
            initial={{ opacity: 0, x: 500 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 500 }}
            transition={{ duration: 0.3, ease: "easeOut", delay: i * 0.005 }}
            whileHover={{ y: -6 }}
            className="relative group rounded-xl overflow-hidden block shadow-[0_0_0_1px_rgba(0,0,0,0.06),0_2px_8px_rgba(0,0,0,0.06)]"
          >
            <img
              src={photo.thumb}
              alt={photo.altDescription}
              className="w-full aspect-[4/3] object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            />
            {/* Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 p-3 flex flex-col justify-end">
              <p className="text-white text-xs font-semibold leading-tight">
                {photo.photographer}
              </p>
              {photo.altDescription && (
                <p className="text-white/75 text-xs mt-0.5 line-clamp-1 leading-snug">
                  {photo.altDescription}
                </p>
              )}
            </div>
          </motion.a>
        ))}
      </div>

      <footer className="mt-5 pt-4 border-t border-[rgba(0,0,0,0.06)]">
        <p className="text-xs text-muted-foreground text-center">
          Photos via Unsplash
        </p>
      </footer>
    </div>
  );
}
