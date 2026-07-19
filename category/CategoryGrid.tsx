"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { Product, Category } from "@/types/schema";
import ProductCard from "@/product/ProductCard";
import LoadingSkeleton from "@/components/LoadingSkeleton";
import EmptyState from "@/components/EmptyState";
import ErrorState from "@/components/ErrorState";
import { getProductsByCategory } from "@/services/productService";

/**
 * RSR-CAT-001 — Category listing page content (/category/{slug}).
 * Phase 5, Step 5: "Both are dynamic, product-grid pages with the
 * category's/collection's banner, description, and a paginated,
 * filterable, sortable grid of matching products using the correct card
 * variants." ProductCard (RSR-PRD-001) already resolves category-aware
 * card variants internally via categoryCardMap, so this component does
 * not duplicate that logic — it only fetches and paginates.
 */

export type ProductSort = "featured" | "newest" | "priceLowHigh" | "priceHighLow" | "rating";

export interface CategoryGridProps {
  category: Category;
}

const PAGE_SIZE = 24;

export default function CategoryGrid({ category }: CategoryGridProps) {
  const [products, setProducts] = useState<Product[] | null>(null);
  const [error, setError] = useState(false);
  const [sort, setSort] = useState<ProductSort>("featured");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setProducts(null);
    setError(false);
    setPage(1);

    getProductsByCategory({ categorySlug: category.slug, sort, page: 1, pageSize: PAGE_SIZE })
      .then((res) => {
        if (cancelled) return;
        setProducts(res.items);
        setHasMore(res.hasMore);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });

    return () => {
      cancelled = true;
    };
  }, [category.slug, sort]);

  const handleLoadMore = async () => {
    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      const res = await getProductsByCategory({
        categorySlug: category.slug,
        sort,
        page: nextPage,
        pageSize: PAGE_SIZE,
      });
      setProducts((prev) => [...(prev ?? []), ...res.items]);
      setHasMore(res.hasMore);
      setPage(nextPage);
    } catch {
      setError(true);
    } finally {
      setLoadingMore(false);
    }
  };

  const sortOptions: { value: ProductSort; label: string }[] = useMemo(
    () => [
      { value: "featured", label: "Featured" },
      { value: "newest", label: "Newest" },
      { value: "priceLowHigh", label: "Price: Low to High" },
      { value: "priceHighLow", label: "Price: High to Low" },
      { value: "rating", label: "Top Rated" },
    ],
    []
  );

  return (
    <div>
      <header className="relative w-full overflow-hidden rounded-[var(--radius-lg)] bg-[var(--color-black-900)]">
        <div className="relative aspect-[21/9] w-full">
          {category.bannerUrl ? (
            <Image
              src={category.bannerUrl}
              alt=""
              fill
              priority
              sizes="100vw"
              className="object-cover"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-[var(--color-black-950)] to-[var(--color-charcoal-800)]" />
          )}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[var(--color-black-950)]/80 to-transparent" />
        </div>
        <div className="absolute inset-x-0 bottom-0 space-y-2 px-6 pb-8 md:px-10">
          <h1 className="font-[var(--font-display)] text-[var(--text-hero)] text-[var(--color-ivory-50)]">
            {category.name}
          </h1>
          {category.description && (
            <p className="max-w-xl text-[var(--text-body)] text-[var(--color-ivory-100)]/85">
              {category.description}
            </p>
          )}
        </div>
      </header>

      <div className="mx-auto max-w-[1280px] px-4 py-8 md:px-8">
        <div className="mb-6 flex items-center justify-between">
          <span className="text-[var(--text-caption)] text-[var(--color-gray-500)]">
            {products ? `${products.length} piece${products.length === 1 ? "" : "s"}` : ""}
          </span>

          <label className="flex items-center gap-2 text-[var(--text-caption)] text-[var(--color-gray-700)]">
            Sort by
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as ProductSort)}
              className="rounded-[var(--radius-sm)] border border-[var(--color-gray-300)] bg-[var(--color-ivory-50)] px-3 py-1.5 text-[var(--color-black-900)]"
            >
              {sortOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        {products === null && !error && (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <LoadingSkeleton key={i} variant="card" />
            ))}
          </div>
        )}

        {error && (
          <ErrorState
            message="Couldn't load this category."
            onRetry={() => setSort((s) => s)}
          />
        )}

        {products && products.length === 0 && (
          <EmptyState
            title="Nothing here yet"
            description="New pieces in this category are on their way."
            actionLabel="Browse all Studios"
            actionHref="/studios"
          />
        )}

        {products && products.length > 0 && (
          <>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
              {products.map((p) => (
                <ProductCard key={p.productId} product={p} />
              ))}
            </div>

            {hasMore && (
              <div className="mt-8 flex justify-center">
                <button
                  type="button"
                  disabled={loadingMore}
                  onClick={handleLoadMore}
                  className="rounded-[var(--radius-sm)] border border-[var(--color-black-900)] px-6 py-3 text-[var(--text-body)] font-medium text-[var(--color-black-900)] transition-all duration-[var(--duration-fast)] ease-[var(--ease-luxury)] hover:bg-[var(--color-black-900)] hover:text-[var(--color-ivory-50)] disabled:opacity-50"
                >
                  {loadingMore ? "Loading…" : "Load More"}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
