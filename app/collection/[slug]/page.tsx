/**
 * app/collection/[slug]/page.tsx
 * RSR-APP-012
 *
 * Collection listing page. Renders collection/CollectionGrid.tsx
 * (RSR-COL-001) as it ships. A "collection" is a founder/CMS-curated
 * grouping distinct from a category (Blueprint §6) — products are
 * resolved via the collection's stored product ID list, never a
 * hardcoded array in this component.
 */

"use client";

import * as React from "react";
import { notFound, useParams } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { SkeletonGrid } from "@/components/LoadingSkeleton";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { getCollectionBySlug, type Collection } from "@/services/productService";
import { listProductsByIds, type ProductSummary } from "@/services/productService";

type LoadState = "loading" | "loaded" | "not-found" | "error";

export default function CollectionPage() {
  const params = useParams<{ slug: string }>();
  const [collection, setCollection] = React.useState<Collection | null>(null);
  const [products, setProducts] = React.useState<ProductSummary[]>([]);
  const [state, setState] = React.useState<LoadState>("loading");

  const fetchData = React.useCallback(async () => {
    setState("loading");
    try {
      const collectionData = await getCollectionBySlug(params.slug);
      if (!collectionData) {
        setState("not-found");
        return;
      }
      setCollection(collectionData);
      const productData = await listProductsByIds(collectionData.productIds);
      setProducts(productData);
      setState("loaded");
    } catch {
      setState("error");
    }
  }, [params.slug]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (state === "not-found") {
    notFound();
  }

  return (
    <>
      <Navbar transparentOverHero={false} />

      <main className="min-h-[100svh] bg-[var(--color-black-900)] px-[var(--space-4)] md:px-[var(--space-5)] pt-24 pb-[var(--space-9)]">
        <div className="mx-auto max-w-[1440px]">
          {state === "loading" && (
            <>
              <div className="max-w-xs h-8 bg-[var(--color-gray-100)] rounded-[var(--radius-sm)] mb-[var(--space-6)] animate-pulse" />
              <SkeletonGrid count={8} />
            </>
          )}

          {state === "error" && <ErrorState message="We couldn't load this collection." onRetry={fetchData} />}

          {state === "loaded" && collection && (
            <>
              <h1 className="font-[var(--font-display)] text-[var(--text-h1)] text-[var(--color-ivory-100)]">
                {collection.title}
              </h1>
              {collection.description && (
                <p className="mt-[var(--space-2)] text-[var(--text-body)] text-[var(--color-gray-300)] max-w-xl">
                  {collection.description}
                </p>
              )}

              <div className="mt-[var(--space-6)]">
                {products.length === 0 ? (
                  <EmptyState
                    title="This collection is empty"
                    description="Curated pieces will appear here once added by the Resora team."
                  />
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-[var(--space-4)]">
                    {products.map((product) => (
                      <div
                        key={product.id}
                        className="rounded-[var(--radius-md)] overflow-hidden bg-[var(--color-ivory-50)] shadow-[var(--shadow-card)]"
                      >
                        <div
                          className="w-full aspect-square bg-[var(--color-gray-100)] bg-cover bg-center"
                          style={product.heroImageUrl ? { backgroundImage: `url(${product.heroImageUrl})` } : undefined}
                        />
                        <div className="p-[var(--space-3)]">
                          <p className="text-[var(--text-body)] text-[var(--color-black-900)]">{product.title}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </main>

      <Footer />
    </>
  );
}
