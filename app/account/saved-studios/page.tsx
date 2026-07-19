"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/hooks/useAuth";
import { useRouteGuard } from "@/hooks/useRouteGuard";
import { studioService } from "@/services/studioService";
import LoadingSkeleton from "@/components/LoadingSkeleton";
import EmptyState from "@/components/EmptyState";
import ErrorState from "@/components/ErrorState";

interface SavedStudio {
  studioId: string;
  name: string;
  slug: string;
  logoUrl: string;
  bannerUrl: string;
  category: string;
  followerCount: number;
  verificationBadge: "none" | "verified" | "top" | "featured" | "premiumChoice";
  active: boolean;
}

type ViewState = "loading" | "ready" | "empty" | "error";

export default function SavedStudiosPage() {
  useRouteGuard({ requiredRole: "customer" });
  const { user } = useAuth();

  const [studios, setStudios] = useState<SavedStudio[]>([]);
  const [viewState, setViewState] = useState<ViewState>("loading");
  const [unfollowingId, setUnfollowingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>("");

  const loadSavedStudios = useCallback(async () => {
    if (!user?.uid) return;
    setViewState("loading");
    try {
      const data = await studioService.getFollowedStudiosForCustomer(user.uid);
      setStudios(data);
      setViewState(data.length === 0 ? "empty" : "ready");
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Could not load saved Studios."
      );
      setViewState("error");
    }
  }, [user?.uid]);

  useEffect(() => {
    loadSavedStudios();
  }, [loadSavedStudios]);

  const handleUnfollow = async (studioId: string) => {
    if (!user?.uid) return;
    setUnfollowingId(studioId);
    const previous = studios;
    const next = studios.filter((s) => s.studioId !== studioId);
    setStudios(next);
    try {
      await studioService.unfollowStudio(user.uid, studioId);
      if (next.length === 0) setViewState("empty");
    } catch (err) {
      setStudios(previous);
      setErrorMessage(
        err instanceof Error ? err.message : "Could not unfollow this Studio."
      );
    } finally {
      setUnfollowingId(null);
    }
  };

  const badgeLabel: Record<SavedStudio["verificationBadge"], string> = {
    none: "",
    verified: "Verified",
    top: "Top Rated",
    featured: "Featured",
    premiumChoice: "Premium Choice",
  };

  if (viewState === "loading") {
    return (
      <div className="mx-auto max-w-5xl px-4 py-12 md:py-16">
        <h1 className="font-display text-h1 text-black-900 mb-8">
          Saved Studios
        </h1>
        <LoadingSkeleton variant="list" count={4} />
      </div>
    );
  }

  if (viewState === "error") {
    return (
      <div className="mx-auto max-w-5xl px-4 py-12 md:py-16">
        <h1 className="font-display text-h1 text-black-900 mb-8">
          Saved Studios
        </h1>
        <ErrorState message={errorMessage} onRetry={loadSavedStudios} />
      </div>
    );
  }

  if (viewState === "empty") {
    return (
      <div className="mx-auto max-w-5xl px-4 py-12 md:py-16">
        <h1 className="font-display text-h1 text-black-900 mb-8">
          Saved Studios
        </h1>
        <EmptyState
          title="No Studios saved yet."
          description="Follow a Studio to keep up with new pieces and updates from that artist."
          actionLabel="Browse Studios"
          actionHref="/studios"
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 md:py-16">
      <h1 className="font-display text-h1 text-black-900 mb-2">
        Saved Studios
      </h1>
      <p className="text-body text-gray-700 mb-8">
        {studios.length} {studios.length === 1 ? "Studio" : "Studios"} followed
      </p>

      {errorMessage && (
        <div className="mb-6 rounded-md bg-error/10 px-4 py-3 text-caption text-error">
          {errorMessage}
        </div>
      )}

      <div className="flex flex-col gap-4">
        {studios.map((studio) => (
          <div
            key={studio.studioId}
            className="flex items-center gap-4 rounded-md bg-ivory-50 p-4 shadow-card transition-shadow duration-base ease-luxury hover:shadow-hover"
          >
            <Link
              href={`/studio/${studio.slug}`}
              className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-full bg-gray-100"
            >
              <Image
                src={studio.logoUrl}
                alt={studio.name}
                fill
                sizes="64px"
                className="object-cover"
              />
            </Link>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <Link
                  href={`/studio/${studio.slug}`}
                  className="font-display text-h3 text-black-900 hover:text-gold-600 truncate"
                >
                  {studio.name}
                </Link>
                {studio.verificationBadge !== "none" && (
                  <span className="rounded-full bg-gold-100 px-2 py-0.5 text-micro text-gold-600 whitespace-nowrap">
                    {badgeLabel[studio.verificationBadge]}
                  </span>
                )}
              </div>
              <p className="text-caption text-gray-500 truncate">
                {studio.category} · {studio.followerCount.toLocaleString("en-IN")}{" "}
                followers
              </p>
              {!studio.active && (
                <p className="mt-1 text-caption text-warning">
                  This Studio is temporarily unavailable.
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={() => handleUnfollow(studio.studioId)}
              disabled={unfollowingId === studio.studioId}
              className="flex-shrink-0 rounded-sm border border-gray-300 px-4 py-2 text-caption text-gray-700 transition-colors duration-fast ease-luxury hover:border-error hover:text-error disabled:opacity-50"
            >
              {unfollowingId === studio.studioId ? "Removing…" : "Unfollow"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
