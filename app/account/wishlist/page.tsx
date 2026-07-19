"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/hooks/useAuth";
import { useRouteGuard } from "@/hooks/useRouteGuard";
import { wishlistService } from "@/services/wishlistService";
import { formatCurrency } from "@/utils/formatCurrency";
import LoadingSkeleton from "@/components/LoadingSkeleton";
import EmptyState from "@/components/EmptyState";
import ErrorState from "@/components/ErrorState";

interface WishlistItem {
  wishlistItemId: string;
  productId: string;
  studioId: string;
  name: string;
  slug: string;
  studioName: string;
  studioSlug: string;
  imageUrl: string;
  price: number;
  inStock: boolean;
  addedAt: string;
}

type ViewState = "loading" | "ready" | "empty" | "error";

export default function WishlistPage() {
  useRouteGuard({ requiredRole: "customer" });
  const { user } = useAuth();

  const [items, setItems] = useState<WishlistItem[]>([]);
  const [viewState, setViewState] = useState<ViewState>("loading");
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>("");

  const loadWishlist = useCallback(async () => {
    if (!user?.uid) return;
    setViewState("loading");
    try {
      const data = await wishlistService.getWishlistForCustomer(user.uid);
      setItems(data);
      setViewState(data.length === 0 ? "empty" : "ready");
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Could not load your wishlist."
      );
      setViewState("error");
    }
  }, [user?.uid]);

  useEffect(() => {
    loadWishlist();
  }, [loadWishlist]);

  const handleRemove = async (wishlistItemId: string) => {
    if (!user?.uid) return;
    setRemovingId(wishlistItemId);
    const previous = items;
    const next = items.filter((item) => item.wishlistItemId !== wishlistItemId);
    setItems(next);
    try {
      await wishlistService.removeFromWishlist(user.uid, wishlistItemId);
      if (next.length === 0) setViewState("empty");
    } catch (err) {
      setItems(previous);
      setErrorMessage(
        err instanceof Error ? err.message : "Could not remove this item."
      );
    } finally {
      setRemovingId(null);
    }
  };

  if (viewState === "loading") {
    return (
      <div className="mx-auto max-w-5xl px-4 py-12 md:py-16">
        <h1 className="font-display text-h1 text-black-900 mb-8">
          Your Wishlist
        </h1>
        <LoadingSkeleton variant="grid" count={6} />
      </div>
    );
  }

  if (viewState === "error") {
    return (
      <div className="mx-auto max-w-5xl px-4 py-12 md:py-16">
        <h1 className="font-display text-h1 text-black-900 mb-8">
          Your Wishlist
        </h1>
        <ErrorState message={errorMessage} onRetry={loadWishlist} />
      </div>
    );
  }

  if (viewState === "empty") {
    return (
      <div className="mx-auto max-w-5xl px-4 py-12 md:py-16">
        <h1 className="font-display text-h1 text-black-900 mb-8">
          Your Wishlist
        </h1>
        <EmptyState
          title="Nothing saved yet."
          description="Items you save from a Studio or product page will appear here."
          actionLabel="Browse Studios"
          actionHref="/studios"
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 md:py-16">
      <h1 className="font-display text-h1 text-black-900 mb-2">
        Your Wishlist
      </h1>
      <p className="text-body text-gray-700 mb-8">
        {items.length} {items.length === 1 ? "piece" : "pieces"} saved
      </p>

      {errorMessage && (
        <div className="mb-6 rounded-md bg-error/10 px-4 py-3 text-caption text-error">
          {errorMessage}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {items.map((item) => (
          <div
            key={item.wishlistItemId}
            className="group relative rounded-md bg-ivory-50 shadow-card overflow-hidden transition-shadow duration-base ease-luxury hover:shadow-hover"
          >
            <Link href={`/product/${item.slug}`} className="block">
              <div className="relative aspect-square w-full bg-gray-100">
                <Image
                  src={item.imageUrl}
                  alt={item.name}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  className="object-cover"
                />
                {!item.inStock && (
                  <div className="absolute inset-x-0 bottom-0 bg-black-900/80 py-2 text-center text-micro tracking-wide text-ivory-50">
                    Currently Unavailable
                  </div>
                )}
              </div>
            </Link>

            <div className="p-4">
              <Link
                href={`/studio/${item.studioSlug}`}
                className="text-micro uppercase tracking-wide text-gray-500 hover:text-gold-600"
              >
                {item.studioName}
              </Link>
              <Link href={`/product/${item.slug}`} className="block">
                <h3 className="mt-1 text-body font-medium text-black-900 line-clamp-1">
                  {item.name}
                </h3>
              </Link>
              <p className="mt-1 text-body-lg text-black-900">
                {formatCurrency(item.price)}
              </p>

              <button
                type="button"
                onClick={() => handleRemove(item.wishlistItemId)}
                disabled={removingId === item.wishlistItemId}
                className="mt-3 text-caption text-gray-500 underline decoration-gray-300 underline-offset-2 transition-colors duration-fast ease-luxury hover:text-error disabled:opacity-50"
              >
                {removingId === item.wishlistItemId ? "Removing…" : "Remove"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
