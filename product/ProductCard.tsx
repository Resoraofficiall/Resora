"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import type { Product } from "@/types/schema";
import { formatCurrency } from "@/utils/formatCurrency";
import { categoryCardMap, DEFAULT_CARD_VARIANT } from "./categoryCardMap";
import WideHorizontal from "./cardVariants/WideHorizontal";
import CircularFrame from "./cardVariants/CircularFrame";
import TallVertical from "./cardVariants/TallVertical";
import CompactRounded from "./cardVariants/CompactRounded";
import GalleryFrame from "./cardVariants/GalleryFrame";

export interface ProductCardProps {
  product: Product;
  priority?: boolean;
  onWishlistToggle?: (productId: string, next: boolean) => void;
  wishlisted?: boolean;
  className?: string;
}

/**
 * RSR-PRD-001 — Base product card.
 *
 * This component owns none of the presentational layout itself. It resolves
 * the correct category-aware card variant via categoryCardMap (RSR-PRD-007)
 * and renders that variant, passing down a single normalized view-model.
 *
 * Design tokens: Ch.5 (§5.1 color, §5.4 radius/shadow/motion, §5.5 card
 * behavior standards). Card variants are visual differentiators, not
 * separate business logic — price, wishlist, and link behavior live here,
 * once, so every variant behaves identically underneath.
 */
export default function ProductCard({
  product,
  priority = false,
  onWishlistToggle,
  wishlisted = false,
  className = "",
}: ProductCardProps) {
  const [imageError, setImageError] = useState(false);

  const variantKey = useMemo(() => {
    const mapped = categoryCardMap[product.category];
    return mapped ?? DEFAULT_CARD_VARIANT;
  }, [product.category]);

  const primaryImage = !imageError && product.images?.[0] ? product.images[0] : null;

  const hasSale =
    typeof product.salePrice === "number" &&
    product.salePrice > 0 &&
    product.salePrice < product.price;

  const displayPrice = hasSale ? product.salePrice! : product.price;

  const isOutOfStock =
    product.inventoryMode === "stock" && (product.inventoryCount ?? 0) <= 0;

  const handleWishlistClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onWishlistToggle?.(product.productId, !wishlisted);
  };

  const viewModel = {
    href: `/product/${product.slug}`,
    title: product.name,
    studioId: product.studioId,
    image: primaryImage,
    onImageError: () => setImageError(true),
    priority,
    priceLabel: formatCurrency(displayPrice),
    compareAtLabel: hasSale ? formatCurrency(product.price) : null,
    isOutOfStock,
    wishlisted,
    onWishlistClick: handleWishlistClick,
    rating: product.rating,
    reviewCount: product.reviewCount,
    className,
  };

  switch (variantKey) {
    case "wideHorizontal":
      return <WideHorizontal {...viewModel} />;
    case "circularFrame":
      return <CircularFrame {...viewModel} />;
    case "tallVertical":
      return <TallVertical {...viewModel} />;
    case "compactRounded":
      return <CompactRounded {...viewModel} />;
    case "galleryFrame":
      return <GalleryFrame {...viewModel} />;
    default:
      return <GalleryFrame {...viewModel} />;
  }
}

/**
 * Shared prop contract every card variant must accept. Kept in this file
 * (not categoryCardMap.ts) since it's the base card's public contract,
 * consumed by all variants in /product/cardVariants/.
 */
export interface ProductCardVariantProps {
  href: string;
  title: string;
  studioId: string;
  image: string | null;
  onImageError: () => void;
  priority: boolean;
  priceLabel: string;
  compareAtLabel: string | null;
  isOutOfStock: boolean;
  wishlisted: boolean;
  onWishlistClick: (e: React.MouseEvent) => void;
  rating?: number;
  reviewCount?: number;
  className?: string;
}

/** Shared wishlist heart button — used identically across all variants. */
export function WishlistButton({
  wishlisted,
  onClick,
}: {
  wishlisted: boolean;
  onClick: (e: React.MouseEvent) => void;
}) {
  return (
    <button
      type="button"
      aria-label={wishlisted ? "Remove from wishlist" : "Add to wishlist"}
      aria-pressed={wishlisted}
      onClick={onClick}
      className="absolute top-3 right-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-[var(--color-ivory-50)]/90 backdrop-blur-sm shadow-[var(--shadow-card)] transition-all duration-[var(--duration-fast)] ease-[var(--ease-luxury)] hover:shadow-[var(--shadow-hover)]"
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill={wishlisted ? "var(--color-gold-500)" : "none"}
        stroke={wishlisted ? "var(--color-gold-500)" : "var(--color-gray-700)"}
        strokeWidth="1.75"
      >
        <path d="M12 21s-7.5-4.6-10-9.1C.6 8.6 2 5 5.4 5c2 0 3.4 1.1 4.6 2.7C11.2 6.1 12.6 5 14.6 5 18 5 19.4 8.6 22 11.9 19.5 16.4 12 21 12 21z" />
      </svg>
    </button>
  );
}

/** Shared price block — used identically across all variants. */
export function PriceBlock({
  priceLabel,
  compareAtLabel,
  isOutOfStock,
}: {
  priceLabel: string;
  compareAtLabel: string | null;
  isOutOfStock: boolean;
}) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="text-[var(--text-body)] font-medium text-[var(--color-black-900)]">
        {priceLabel}
      </span>
      {compareAtLabel && (
        <span className="text-[var(--text-caption)] text-[var(--color-gray-500)] line-through">
          {compareAtLabel}
        </span>
      )}
      {isOutOfStock && (
        <span className="text-[var(--text-micro)] uppercase tracking-wide text-[var(--color-gray-500)]">
          Out of stock
        </span>
      )}
    </div>
  );
}
