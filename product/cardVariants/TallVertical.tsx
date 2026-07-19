import Image from "next/image";
import Link from "next/link";
import type { ProductCardVariantProps } from "../ProductCard";
import { WishlistButton, PriceBlock } from "../ProductCard";

/**
 * RSR-PRD-004 — Tall-vertical card.
 * Used for: Bookmarks, and Jewelry (macro-style centered crop reads
 * closest to this variant among the five), per §30.9.1 and
 * categoryCardMap.ts (RSR-PRD-007).
 */
export default function TallVertical({
  href,
  title,
  image,
  onImageError,
  priority,
  priceLabel,
  compareAtLabel,
  isOutOfStock,
  wishlisted,
  onWishlistClick,
  rating,
  reviewCount,
  className = "",
}: ProductCardVariantProps) {
  return (
    <Link href={href} className={`group block ${className}`} aria-label={title}>
      <div className="relative overflow-hidden rounded-[var(--radius-md)] bg-[var(--color-ivory-50)] shadow-[var(--shadow-card)] transition-shadow duration-[var(--duration-base)] ease-[var(--ease-luxury)] group-hover:shadow-[var(--shadow-hover)]">
        <WishlistButton wishlisted={wishlisted} onClick={onWishlistClick} />

        {/* Tall portrait aspect — macro-style centered crop for jewelry/bookmarks */}
        <div className="relative aspect-[3/5] w-full overflow-hidden bg-[var(--color-gray-100)]">
          {image ? (
            <Image
              src={image}
              alt={title}
              fill
              sizes="(min-width: 1024px) 20vw, (min-width: 640px) 33vw, 50vw"
              priority={priority}
              onError={onImageError}
              className="object-cover object-center transition-transform duration-[var(--duration-slow)] ease-[var(--ease-luxury)] group-hover:scale-[1.04]"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-[var(--color-gray-300)]">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <path d="M21 15l-5-5L5 21" />
              </svg>
            </div>
          )}

          {isOutOfStock && (
            <div className="absolute inset-0 bg-[var(--color-black-900)]/30" />
          )}

          {/* Subtle bottom gradient so overlaid metadata reads on any photo */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-[var(--color-black-900)]/50 to-transparent" />

          <div className="absolute inset-x-0 bottom-0 space-y-1 p-3">
            <h3 className="line-clamp-1 text-[var(--text-body)] font-[var(--font-display)] text-[var(--color-ivory-50)]">
              {title}
            </h3>
            {typeof rating === "number" && reviewCount ? (
              <div className="flex items-center gap-1 text-[var(--text-micro)] text-[var(--color-ivory-100)]/85">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="var(--color-gold-500)">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 21 12 17.77 5.82 21 7 14.14l-5-4.87 6.91-1.01L12 2z" />
                </svg>
                <span>{rating.toFixed(1)}</span>
                <span>({reviewCount})</span>
              </div>
            ) : null}
          </div>
        </div>

        <div className="p-3">
          <PriceBlock
            priceLabel={priceLabel}
            compareAtLabel={compareAtLabel}
            isOutOfStock={isOutOfStock}
          />
        </div>
      </div>
    </Link>
  );
}
