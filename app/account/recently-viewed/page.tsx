"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/hooks/useAuth";
import { useRouteGuard } from "@/hooks/useRouteGuard";
import { productService } from "@/services/productService";
import { formatCurrency } from "@/utils/formatCurrency";
import LoadingSkeleton from "@/components/LoadingSkeleton";
import EmptyState from "@/components/EmptyState";
import ErrorState from "@/components/ErrorState";
import Button from "@/components/Button";

interface RecentlyViewedItem {
  productId: string;
  name: string;
  slug: string;
  studioName: string;
  studioSlug: string;
  imageUrl: string;
  price: number;
  inStock: boolean;
  viewedAt: string;
}

type ViewState = "loading" | "ready" | "empty" | "error";

export default function RecentlyViewedPage() {
  useRouteGuard({ requiredRole: "customer" });
  const { user } = useAuth();

  const [items, setItems] = useState<RecentlyViewedItem[]>([]);
  const [viewState, setViewState] = useState<ViewState>("loading");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [clearing, setClearing] = useState(false);

  const loadRecentlyViewed = useCallback(async () => {
    if (!user?.uid) return;
    setViewState("loading");
    try {
      const data = await productService.getRecentlyViewed(user.uid);
      setItems(data);
      setViewState(data.length === 0 ? "empty" : "ready");
    } catch (err) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : "Could not load recently viewed items."
      );
      setViewState("error");
    }
  }, [user?.uid]);

  useEffect(() => {
    loadRecentlyViewed();
  }, [loadRecentlyViewed]);

  const handleClearAll = async () => {
    if (!user?.uid) return;
    setClearing(true);
    const previous = items;
    setItems([]);
    setViewState("empty");
    try {
      await productService.clearRecentlyViewed(user.uid);
    } catch (err) {
      setItems(previous);
      setViewState("ready");
      setErrorMessage(
        err instanceof Error ? err.message : "Could not clear your history."
      );
    } finally {
      setClearing(false);
    }
  };

  if (viewState === "loading") {
    return (
      <div className="mx-auto max-w-5xl px-4 py-12 md:py-16">
        <h1 className="font-display text-h1 text-black-900 mb-8">
          Recently Viewed
        </h1>
        <LoadingSkeleton variant="grid" count={6} />
      </div>
    );
  }

  if (viewState === "error") {
    return (
      <div className="mx-auto max-w-5xl px-4 py-12 md:py-16">
        <h1 className="font-display text-h1 text-black-900 mb-8">
          Recently Viewed
        </h1>
        <ErrorState message={errorMessage} onRetry={loadRecentlyViewed} />
      </div>
    );
  }

  if (viewState === "empty") {
    return (
      <div className="mx-auto max-w-5xl px-4 py-12 md:py-16">
        <h1 className="font-display text-h1 text-black-900 mb-8">
          Recently Viewed
        </h1>
        <EmptyState
          title="Nothing here yet."
          description="Products you view will appear here so you can find them again easily."
          actionLabel="Browse Studios"
          actionHref="/studios"
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 md:py-16">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="font-display text-h1 text-black-900 mb-2">
            Recently Viewed
          </h1>
          <p className="text-body text-gray-700">
            {items.length} {items.length === 1 ? "item" : "items"}
          </p>
        </div>
        <Button
          variant="ghost"
          onClick={handleClearAll}
          loading={clearing}
        >
          Clear All
        </Button>
      </div>

      {errorMessage && (
        <div className="mb-6 rounded-md bg-error/10 px-4 py-3 text-caption text-error">
          {errorMessage}
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
        {items.map((item) => (
          <Link
            key={item.productId}
            href={`/product/${item.slug}`}
            className="group rounded-md bg-ivory-50 shadow-card overflow-hidden transition-shadow duration-base ease-luxury hover:shadow-hover"
          >
            <div className="relative aspect-square w-full bg-gray-100">
              <Image
                src={item.imageUrl}
                alt={item.name}
                fill
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                className="object-cover"
              />
              {!item.inStock && (
                <div className="absolute inset-x-0 bottom-0 bg-black-900/80 py-1.5 text-center text-micro tracking-wide text-ivory-50">
                  Unavailable
                </div>
              )}
            </div>
            <div className="p-3">
              <p className="text-micro uppercase tracking-wide text-gray-500 truncate">
                {item.studioName}
              </p>
              <h3 className="mt-1 text-caption font-medium text-black-900 line-clamp-1">
                {item.name}
              </h3>
              <p className="mt-1 text-body text-black-900">
                {formatCurrency(item.price)}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
