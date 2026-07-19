"use client";

import Image from "next/image";
import type { Studio } from "@/types/schema";
import FollowButton from "./FollowButton";
import ShareButtons from "@/components/ShareButtons";

/**
 * RSR-STU-001 — Studio hero banner.
 * §30.8: "Luxury homepage, luxury hero banner..." — first section of every
 * provisioned Studio page (/studio/{slug}), per Phase 5 Step 3.
 *
 * Banner media is either the seller's uploaded bannerUrl (Canvas
 * Engine-composited per §30.9 at upload time) or, if none exists yet
 * (fresh provisioning, seller hasn't customized), a founder-approved
 * default banner treatment — never a blank/broken hero.
 */

export interface StudioHeroProps {
  studio: Pick<
    Studio,
    | "studioId"
    | "name"
    | "slug"
    | "logoUrl"
    | "bannerUrl"
    | "verificationBadge"
    | "followerCount"
    | "rating"
    | "reviewCount"
  >;
  isFollowing: boolean;
  onFollowChange: (next: boolean) => void;
  followDisabled?: boolean;
}

const BADGE_LABEL: Record<string, string> = {
  verified: "Verified",
  top: "Top Studio",
  featured: "Featured",
  premiumChoice: "Premium Choice",
};

export default function StudioHero({
  studio,
  isFollowing,
  onFollowChange,
  followDisabled = false,
}: StudioHeroProps) {
  const badgeLabel =
    studio.verificationBadge && studio.verificationBadge !== "none"
      ? BADGE_LABEL[studio.verificationBadge]
      : null;

  return (
    <header className="relative w-full overflow-hidden rounded-[var(--radius-lg)] bg-[var(--color-black-900)]">
      <div className="relative aspect-[21/9] w-full">
        {studio.bannerUrl ? (
          <Image
            src={studio.bannerUrl}
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-[var(--color-black-950)] via-[var(--color-charcoal-800)] to-[var(--color-black-900)]" />
        )}

        {/* Consistent readability gradient regardless of banner content */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[var(--color-black-950)]/80 via-[var(--color-black-950)]/10 to-transparent" />
      </div>

      <div className="relative z-10 flex flex-col gap-4 px-6 pb-6 pt-0 sm:flex-row sm:items-end sm:justify-between sm:px-10 sm:pb-8 md:-mt-16">
        <div className="flex items-end gap-4">
          <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-full ring-4 ring-[var(--color-ivory-50)] shadow-[var(--shadow-modal)] sm:h-28 sm:w-28">
            {studio.logoUrl ? (
              <Image
                src={studio.logoUrl}
                alt={`${studio.name} logo`}
                fill
                sizes="112px"
                className="object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-[var(--color-gray-100)] font-[var(--font-display)] text-[var(--text-h2)] text-[var(--color-gray-500)]">
                {studio.name.charAt(0)}
              </div>
            )}
          </div>

          <div className="space-y-1 pb-1">
            <div className="flex items-center gap-2">
              <h1 className="font-[var(--font-display)] text-[var(--text-h1)] text-[var(--color-ivory-50)]">
                {studio.name}
              </h1>
              {badgeLabel && (
                <span className="rounded-[var(--radius-full)] bg-[var(--color-gold-500)] px-2.5 py-0.5 text-[var(--text-micro)] font-medium uppercase tracking-wide text-[var(--color-black-900)]">
                  {badgeLabel}
                </span>
              )}
            </div>

            <div className="flex items-center gap-3 text-[var(--text-caption)] text-[var(--color-ivory-100)]/80">
              {typeof studio.rating === "number" && studio.reviewCount ? (
                <span className="flex items-center gap-1">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="var(--color-gold-500)">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 21 12 17.77 5.82 21 7 14.14l-5-4.87 6.91-1.01L12 2z" />
                  </svg>
                  {studio.rating.toFixed(1)} ({studio.reviewCount})
                </span>
              ) : null}
              <span>
                {studio.followerCount ?? 0} follower{(studio.followerCount ?? 0) === 1 ? "" : "s"}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 pb-1">
          <FollowButton
            studioId={studio.studioId}
            isFollowing={isFollowing}
            onChange={onFollowChange}
            disabled={followDisabled}
          />
          <ShareButtons url={`/studio/${studio.slug}`} title={studio.name} />
        </div>
      </div>
    </header>
  );
}
