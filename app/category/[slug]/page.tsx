/**
 * app/category/[slug]/page.tsx
 * RSR-APP-011
 *
 * Category listing page. Renders category/CategoryGrid.tsx
 * (RSR-CAT-001) as it ships. Products are queried live via
 * productService — this route never hardcodes a category-to-product
 * mapping or example items.
 */

"use client";

import * as React from "react";
import { notFound, useParams } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { SkeletonGrid } from "@/components/LoadingSkeleton";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { getCategoryBySlug, type Category } from "@/services/productService";
import { listProductsByCategory, type ProductSummary } from "@/services/productService";

type LoadState = "loading" | "loaded" | "not-found" | "error";

export default function CategoryPage() {
  const params = useParams<{ slug: string }>();
  const [category, setCategory] = React.useState<Category | null>(null);
  const [products, setProducts] = React.useState<ProductSummary[]>([]);
  const [state, setState] = React.useState<LoadState>("loading");

  const fetchData = React.useCallback(async () => {
    setState("loading");
    try {
      const categoryData = await getCategoryBySlug(params.slug);
      if (!categoryData) {
        setState("not-found");
        return;
      }
      setCategory(categoryData);
      const productData = await listProductsByCategory(categoryData.slug);
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

          {state === "error" && <ErrorState message="We couldn't load this category." onRetry={fetchData} />}

          {state === "loaded" && category && (
            <>
              <h1 className="font-[var(--font-display)] text-[var(--text-h1)] text-[var(--color-ivory-100)]">
                {category.name}
              </h1>
              {category.description && (
                <p className="mt-[var(--space-2)] text-[var(--text-body)] text-[var(--color-gray-300)] max-w-xl">
                  {category.description}
                </p>
              )}

              <div className="mt-[var(--space-6)]">
                {products.length === 0 ? (
                  <EmptyState
                    title="Nothing here yet"
                    description="New pieces in this category will appear as studios publish them."
                  />
                ) : (
                  // product/categoryCardMap.ts (RSR-PRD-007) drives which
                  // card variant renders per category once Phase 4 ships —
                  // this grid is the placeholder base-card layout until then.
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
