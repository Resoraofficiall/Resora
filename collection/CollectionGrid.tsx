"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import type { Product, Collection } from "@/types/schema";
import ProductCard from "@/product/ProductCard";
import LoadingSkeleton from "@/components/LoadingSkeleton";
import EmptyState from "@/components/EmptyState";
import ErrorState from "@/components/ErrorState";
import { getProductsByCollection } from "@/services/productService";
import type { ProductSort } from "@/category/CategoryGrid";

/**
 * RSR-COL-001 — Collection page content (/collection/{slug}).
 * Phase 5, Step 5: same shape as CategoryGrid (banner, description,
 * paginated/filterable/sortable product grid using correct card
 * variants) but sourced from a curated collection rather than a
 * taxonomy category — collections reference products via
 * products/{id}.collectionIds[] (Ch.6.2), not a standalone category
 * field, so the fetch (getProductsByCollection) is a distinct query.
 */

export interface CollectionGridProps {
  collection: Collection;
}

const PAGE_SIZE = 24;

export default function CollectionGrid({ collection }: CollectionGridProps) {
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

    getProductsByCollection({
      collectionId: collection.collectionId,
      sort,
      page: 1,
      pageSize: PAGE_SIZE,
    })
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
  }, [collection.collectionId, sort]);

  const handleLoadMore = async () => {
    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      const res = await getProductsByCollection({
        collectionId: collection.collectionId,
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

  return (
    <div>
      <header className="relative w-full overflow-hidden rounded-[var(--radius-lg)] bg-[var(--color-black-900)]">
        <div className="relative aspect-[21/9] w-full">
          {collection.bannerUrl ? (
            <Image
              src={collection.bannerUrl}
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
            {collection.name}
          </h1>
          {collection.description && (
            <p className="max-w-xl text-[var(--text-body)] text-[var(--color-ivory-100)]/85">
              {collection.description}
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
              <option value="featured">Featured</option>
              <option value="newest">Newest</option>
              <option value="priceLowHigh">Price: Low to High</option>
              <option value="priceHighLow">Price: High to Low</option>
              <option value="rating">Top Rated</option>
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
            message="Couldn't load this collection."
            onRetry={() => setSort((s) => s)}
          />
        )}

        {products && products.length === 0 && (
          <EmptyState
            title="This collection is still taking shape"
            description="Check back soon, or explore other curated collections."
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
