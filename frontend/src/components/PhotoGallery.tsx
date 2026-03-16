import { motion } from "framer-motion";
import type { UnsplashPhoto } from "../types";

interface PhotoGalleryProps {
  photos: UnsplashPhoto[];
}

const heights = ["aspect-[3/4]", "aspect-[4/3]", "aspect-[1/1]", "aspect-[3/5]", "aspect-[4/3]"];

export default function PhotoGallery({ photos }: PhotoGalleryProps) {
  return (
    <div className="p-5">
      <header className="mb-5 pb-4 border-b border-border">
        <p className="font-display text-sm font-semibold text-foreground">
          Visual Inspiration
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {photos.length} {photos.length === 1 ? "photo" : "photos"}
        </p>
      </header>

      {/* Masonry-ish layout with columns */}
      <div className="columns-2 gap-3 space-y-3">
        {photos.map((photo, i) => (
          <motion.a
            key={photo.id}
            href={photo.photographerUrl}
            target="_blank"
            rel="noopener noreferrer"
            initial={{ opacity: 0, x: 20, rotate: 2 }}
            animate={{ opacity: 1, x: 0, rotate: 0 }}
            transition={{ duration: 0.4, ease: "easeOut", delay: i * 0.05 }}
            whileHover={{ y: -4, boxShadow: "0 8px 25px -8px rgba(0,0,0,0.2)" }}
            className="relative group block break-inside-avoid rounded-lg overflow-hidden border-[3px] border-background shadow-sm hover:border-secondary transition-colors duration-300"
          >
            <img
              src={photo.url}
              alt={photo.altDescription}
              className={`w-full object-cover ${heights[i % heights.length]} transition-transform duration-500 group-hover:scale-105`}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-foreground/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 p-3 flex flex-col justify-end">
              <p className="text-primary-foreground text-xs font-semibold leading-tight">
                {photo.photographer}
              </p>
              {photo.altDescription && (
                <p className="text-primary-foreground/75 text-xs mt-0.5 line-clamp-1 leading-snug">
                  {photo.altDescription}
                </p>
              )}
            </div>
          </motion.a>
        ))}
      </div>

      <footer className="mt-5 pt-4 border-t border-border">
        <p className="text-xs text-muted-foreground text-center">
          Photos via Unsplash
        </p>
      </footer>
    </div>
  );
}
