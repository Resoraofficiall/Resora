/**
 * app/studios/page.tsx
 * RSR-APP-009
 *
 * Studio Directory. Queries studios where status: "active" and
 * approved: true only — same rule as the Discovery Pad's Seller
 * Selection Gallery (§30.7) — via the services layer, never a direct
 * Firestore call from this component (§18.2). Zero hardcoded/example
 * studio data anywhere in this page.
 */

"use client";

import * as React from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card } from "@/components/Card";
import { SkeletonGrid } from "@/components/LoadingSkeleton";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { listActiveStudios, type StudioSummary } from "@/services/studioService";

type LoadState = "loading" | "loaded" | "error";

export default function StudiosDirectoryPage() {
  const [studios, setStudios] = React.useState<StudioSummary[]>([]);
  const [state, setState] = React.useState<LoadState>("loading");

  const fetchStudios = React.useCallback(async () => {
    setState("loading");
    try {
      const data = await listActiveStudios();
      setStudios(data);
      setState("loaded");
    } catch {
      setState("error");
    }
  }, []);

  React.useEffect(() => {
    fetchStudios();
  }, [fetchStudios]);

  return (
    <>
      <Navbar transparentOverHero={false} />

      <main className="min-h-[100svh] bg-[var(--color-black-900)] px-[var(--space-4)] md:px-[var(--space-5)] pt-24 pb-[var(--space-9)]">
        <div className="mx-auto max-w-[1440px]">
          <h1 className="font-[var(--font-display)] text-[var(--text-h1)] text-[var(--color-ivory-100)]">
            Studio Directory
          </h1>
          <p className="mt-[var(--space-2)] text-[var(--text-body)] text-[var(--color-gray-300)] max-w-xl">
            Every studio here is founder-verified and actively producing.
          </p>

          <div className="mt-[var(--space-6)]">
            {state === "loading" && <SkeletonGrid count={8} />}

            {state === "error" && <ErrorState message="We couldn't load the Studio Directory." onRetry={fetchStudios} />}

            {state === "loaded" && studios.length === 0 && (
              <EmptyState
                title="No studios yet"
                description="Founder-verified studios will appear here as they're approved."
              />
            )}

            {state === "loaded" && studios.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-[var(--space-4)]">
                {studios.map((studio) => (
                  <Link key={studio.id} href={`/studio/${studio.slug}`}>
                    <Card interactive padding="none" className="overflow-hidden h-full flex flex-col">
                      <div
                        className="w-full aspect-square bg-[var(--color-gray-100)] bg-cover bg-center"
                        style={studio.heroImageUrl ? { backgroundImage: `url(${studio.heroImageUrl})` } : undefined}
                      />
                      <div className="p-[var(--space-3)] flex flex-col gap-[var(--space-1)]">
                        <h2 className="font-[var(--font-display)] text-[var(--text-h3)] text-[var(--color-black-900)]">
                          {studio.name}
                        </h2>
                        <p className="text-[var(--text-caption)] text-[var(--color-gray-700)]">
                          {studio.primaryCategory}
                        </p>
                      </div>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}
