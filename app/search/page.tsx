/**
 * app/search/page.tsx
 * RSR-APP-013
 *
 * Firestore-backed search in V1 (Blueprint §9.1), abstracted behind
 * searchService.ts (RSR-SVC-009) so a future Algolia/Meilisearch swap
 * never touches this component. Note: this conventional search page is
 * intentionally separate from the Discovery Pad's handwriting-search
 * Mode 1 (§30.5) — the Pad is homepage-only and studio-scoped; this
 * page is the general product/studio search surface reachable from the
 * navbar's search icon.
 */

"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { SkeletonGrid } from "@/components/LoadingSkeleton";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { search, type SearchResult } from "@/services/searchService";

type LoadState = "idle" | "loading" | "loaded" | "error";

export default function SearchPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") ?? "";

  const [query, setQuery] = React.useState(initialQuery);
  const [results, setResults] = React.useState<SearchResult[]>([]);
  const [state, setState] = React.useState<LoadState>(initialQuery ? "loading" : "idle");

  const runSearch = React.useCallback(async (term: string) => {
    if (!term.trim()) {
      setResults([]);
      setState("idle");
      return;
    }
    setState("loading");
    try {
      const data = await search(term.trim());
      setResults(data);
      setState("loaded");
    } catch {
      setState("error");
    }
  }, []);

  React.useEffect(() => {
    runSearch(initialQuery);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    router.push(`/search?q=${encodeURIComponent(query)}`);
    runSearch(query);
  };

  return (
    <>
      <Navbar transparentOverHero={false} />

      <main className="min-h-[100svh] bg-[var(--color-black-900)] px-[var(--space-4)] md:px-[var(--space-5)] pt-24 pb-[var(--space-9)]">
        <div className="mx-auto max-w-[1440px]">
          <form onSubmit={handleSubmit} className="max-w-xl">
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search products and studios"
              className="h-12 w-full rounded-[var(--radius-sm)] bg-[var(--color-charcoal-800)] px-[var(--space-4)] text-[var(--text-body)] text-[var(--color-ivory-100)] placeholder:text-[var(--color-gray-500)] focus:outline-none focus:ring-2 focus:ring-[var(--color-gold-500)]"
            />
          </form>

          <div className="mt-[var(--space-6)]">
            {state === "idle" && (
              <EmptyState title="Search Resora" description="Find products and studios by name, category, or material." />
            )}

            {state === "loading" && <SkeletonGrid count={8} />}

            {state === "error" && <ErrorState message="We couldn't complete your search." onRetry={() => runSearch(query)} />}

            {state === "loaded" && results.length === 0 && (
              <EmptyState title="No results" description={`Nothing matched "${query}". Try a different term.`} />
            )}

            {state === "loaded" && results.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-[var(--space-4)]">
                {results.map((result) => (
                  <div
                    key={result.id}
                    className="rounded-[var(--radius-md)] overflow-hidden bg-[var(--color-ivory-50)] shadow-[var(--shadow-card)]"
                  >
                    <div
                      className="w-full aspect-square bg-[var(--color-gray-100)] bg-cover bg-center"
                      style={result.imageUrl ? { backgroundImage: `url(${result.imageUrl})` } : undefined}
                    />
                    <div className="p-[var(--space-3)]">
                      <p className="text-[var(--text-body)] text-[var(--color-black-900)]">{result.title}</p>
                      <p className="text-[var(--text-micro)] text-[var(--color-gray-500)] uppercase">{result.type}</p>
                    </div>
                  </div>
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
