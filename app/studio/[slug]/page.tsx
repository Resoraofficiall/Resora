/**
 * app/studio/[slug]/page.tsx
 * RSR-APP-008
 *
 * Public Studio page — destination of both the Discovery Pad's
 * handwriting-match route (§30.5) and the Studio Directory's cards.
 * Composes the /studio component set (StudioHero, ArtistStory,
 * StudioGallery, FollowButton — Phase 5/9) via the services layer only.
 */

"use client";

import * as React from "react";
import { notFound, useParams } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { SkeletonLine, SkeletonGrid } from "@/components/LoadingSkeleton";
import { ErrorState } from "@/components/ErrorState";
import { getStudioBySlug, type Studio } from "@/services/studioService";

type LoadState = "loading" | "loaded" | "not-found" | "error";

export default function StudioPage() {
  const params = useParams<{ slug: string }>();
  const [studio, setStudio] = React.useState<Studio | null>(null);
  const [state, setState] = React.useState<LoadState>("loading");

  const fetchStudio = React.useCallback(async () => {
    setState("loading");
    try {
      // Studios must satisfy status: "active" AND approved: true —
      // enforced inside studioService, never re-implemented as a
      // client-side filter here (§18.2, §30.7).
      const data = await getStudioBySlug(params.slug);
      if (!data) {
        setState("not-found");
        return;
      }
      setStudio(data);
      setState("loaded");
    } catch {
      setState("error");
    }
  }, [params.slug]);

  React.useEffect(() => {
    fetchStudio();
  }, [fetchStudio]);

  if (state === "not-found") {
    notFound();
  }

  return (
    <>
      <Navbar transparentOverHero />

      <main className="min-h-[100svh] bg-[var(--color-black-900)]">
        {state === "loading" && (
          <div className="px-[var(--space-4)] pt-24 pb-[var(--space-9)] max-w-[1440px] mx-auto">
            <SkeletonLine width="40%" height="40px" />
            <div className="mt-[var(--space-3)]">
              <SkeletonLine width="60%" height="18px" />
            </div>
            <div className="mt-[var(--space-6)]">
              <SkeletonGrid count={6} />
            </div>
          </div>
        )}

        {state === "error" && (
          <div className="pt-24 pb-[var(--space-9)]">
            <ErrorState message="We couldn't load this Studio." onRetry={fetchStudio} />
          </div>
        )}

        {state === "loaded" && studio && (
          <div className="pt-16">
            {/* studio/StudioHero.tsx (RSR-STU-001), studio/ArtistStory.tsx
                (RSR-STU-002), studio/StudioGallery.tsx (RSR-STU-003), and
                studio/FollowButton.tsx (RSR-STU-005) compose here as each
                ships — this route intentionally holds only data-fetch and
                layout responsibility, per the services-layer rule. */}
            <section className="px-[var(--space-4)] md:px-[var(--space-5)] max-w-[1440px] mx-auto">
              <h1 className="font-[var(--font-display)] text-[var(--text-h1)] text-[var(--color-ivory-100)]">
                {studio.name}
              </h1>
              <p className="mt-[var(--space-2)] text-[var(--text-body)] text-[var(--color-gray-300)] max-w-2xl">
                {studio.tagline}
              </p>
            </section>
          </div>
        )}
      </main>

      <Footer />
    </>
  );
}
