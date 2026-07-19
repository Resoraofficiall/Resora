"use client";

import { useState } from "react";
import Image from "next/image";
import type { Studio } from "@/types/schema";

/**
 * RSR-STU-003 — Studio gallery section.
 * §30.8: "...product gallery... luxury product videos (Canvas
 * Engine-generated per §30.9)..." and §30.8.1's approved-layout-presets
 * customization.
 *
 * Renders the studio's galleryUrls[] (Ch.6.2 studios schema) as a
 * lightbox-style grid. Layout preset comes from the studio's
 * customization settings (StoreCustomizationPanel, RSR-STU-004) — this
 * component accepts the resolved `layout` prop rather than reading
 * customization state itself, keeping it a pure presentational piece
 * Phase 10's admin/customization editor can preview against.
 */

export type GalleryLayout = "grid" | "masonry" | "carousel";

export interface StudioGalleryProps {
  galleryUrls: Studio["galleryUrls"];
  layout?: GalleryLayout;
  studioName: string;
}

export default function StudioGallery({
  galleryUrls,
  layout = "grid",
  studioName,
}: StudioGalleryProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  if (!galleryUrls || galleryUrls.length === 0) return null;

  const gridClass =
    layout === "masonry"
      ? "columns-2 gap-4 sm:columns-3 [&>*]:mb-4 [&>*]:break-inside-avoid"
      : layout === "carousel"
      ? "flex snap-x snap-mandatory gap-4 overflow-x-auto"
      : "grid grid-cols-2 gap-4 sm:grid-cols-3";

  return (
    <section className="mx-auto max-w-[1280px] space-y-6 px-4 py-16 md:px-8">
      <h2 className="font-[var(--font-display)] text-[var(--text-h2)] text-[var(--color-black-900)]">
        Gallery
      </h2>

      <div className={gridClass}>
        {galleryUrls.map((url, i) => (
          <button
            key={url + i}
            type="button"
            onClick={() => setLightboxIndex(i)}
            className={`relative overflow-hidden rounded-[var(--radius-md)] bg-[var(--color-gray-100)] shadow-[var(--shadow-card)] transition-shadow duration-[var(--duration-base)] ease-[var(--ease-luxury)] hover:shadow-[var(--shadow-hover)] ${
              layout === "carousel" ? "aspect-[4/5] w-64 shrink-0 snap-start" : "aspect-square w-full"
            }`}
          >
            <Image
              src={url}
              alt={`${studioName} gallery image ${i + 1}`}
              fill
              sizes="(min-width: 640px) 33vw, 50vw"
              className="object-cover transition-transform duration-[var(--duration-slow)] ease-[var(--ease-luxury)] hover:scale-[1.03]"
            />
          </button>
        ))}
      </div>

      {lightboxIndex !== null && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--color-black-950)]/90 p-4"
          onClick={() => setLightboxIndex(null)}
        >
          <button
            type="button"
            aria-label="Close gallery"
            onClick={() => setLightboxIndex(null)}
            className="absolute right-6 top-6 text-[var(--color-ivory-50)]"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>

          <div className="relative h-[80vh] w-full max-w-3xl">
            <Image
              src={galleryUrls[lightboxIndex]}
              alt={`${studioName} gallery image ${lightboxIndex + 1}`}
              fill
              sizes="100vw"
              className="object-contain"
            />
          </div>
        </div>
      )}
    </section>
  );
}
