import Image from "next/image";
import type { Studio } from "@/types/schema";

/**
 * RSR-STU-002 — Artist story section.
 * §30.8: "...artist story... 'about the artist'..." — part of every
 * provisioned Studio page.
 *
 * Renders only content the seller has actually provided (Ch.1's
 * "zero hardcoding, never invented content" principle applies to studio
 * pages the same way it does to Seller Selection Gallery cards) —
 * omits the section entirely rather than showing empty/placeholder copy
 * if description is unset.
 */

export interface ArtistStoryProps {
  studio: Pick<Studio, "name" | "description" | "logoUrl">;
  portraitUrl?: string | null;
}

export default function ArtistStory({ studio, portraitUrl }: ArtistStoryProps) {
  if (!studio.description) return null;

  return (
    <section className="mx-auto grid max-w-[1280px] grid-cols-1 gap-10 px-4 py-16 md:grid-cols-[1fr_1.4fr] md:gap-16 md:px-8">
      <div className="relative aspect-[4/5] w-full overflow-hidden rounded-[var(--radius-lg)] bg-[var(--color-gray-100)]">
        {portraitUrl ? (
          <Image
            src={portraitUrl}
            alt={studio.name}
            fill
            sizes="(min-width: 768px) 40vw, 100vw"
            className="object-cover"
          />
        ) : studio.logoUrl ? (
          <Image
            src={studio.logoUrl}
            alt={studio.name}
            fill
            sizes="(min-width: 768px) 40vw, 100vw"
            className="object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center font-[var(--font-display)] text-[var(--text-hero)] text-[var(--color-gray-300)]">
            {studio.name.charAt(0)}
          </div>
        )}
      </div>

      <div className="flex flex-col justify-center space-y-4">
        <span className="text-[var(--text-caption)] font-medium uppercase tracking-wide text-[var(--color-gold-600)]">
          About the Artist
        </span>
        <h2 className="font-[var(--font-display)] text-[var(--text-h1)] text-[var(--color-black-900)]">
          {studio.name}
        </h2>
        <p className="whitespace-pre-line text-[var(--text-body-lg)] leading-relaxed text-[var(--color-gray-700)]">
          {studio.description}
        </p>
      </div>
    </section>
  );
}
