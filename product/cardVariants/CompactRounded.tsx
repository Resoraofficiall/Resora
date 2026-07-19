import Image from "next/image";
import Link from "next/link";
import type { ProductCardVariantProps } from "../ProductCard";
import { WishlistButton, PriceBlock } from "../ProductCard";

/**
 * RSR-PRD-005 — Compact-rounded card.
 * Used for: Keychains / small accessories, per §30.9.1's category →
 * frame preset table. Deliberately the smallest-footprint variant so a
 * grid of tiny items doesn't waste whitespace the way a full-size card
 * would for a small product.
 */
export default function CompactRounded({
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
  className = "",
}: ProductCardVariantProps) {
  return (
    <Link href={href} className={`group block ${className}`} aria-label={title}>
      <div className="relative overflow-hidden rounded-[var(--radius-lg)] bg-[var(--color-ivory-50)] p-3 shadow-[var(--shadow-card)] transition-shadow duration-[var(--duration-base)] ease-[var(--ease-luxury)] group-hover:shadow-[var(--shadow-hover)]">
        <div className="absolute right-2 top-2 z-10 scale-90">
          <WishlistButton wishlisted={wishlisted} onClick={onWishlistClick} />
        </div>

        <div className="relative aspect-square w-full overflow-hidden rounded-[var(--radius-md)] bg-[var(--color-gray-100)]">
          {image ? (
            <Image
              src={image}
              alt={title}
              fill
              sizes="(min-width: 1024px) 16vw, (min-width: 640px) 25vw, 40vw"
              priority={priority}
              onError={onImageError}
              className="object-contain p-3 transition-transform duration-[var(--duration-slow)] ease-[var(--ease-luxury)] group-hover:scale-[1.06]"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-[var(--color-gray-300)]">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="12" cy="8" r="3" />
                <path d="M12 11v10M9 16h6" />
              </svg>
            </div>
          )}

          {isOutOfStock && (
            <div className="absolute inset-0 bg-[var(--color-black-900)]/25" />
          )}
        </div>

        <div className="mt-2 space-y-0.5">
          <h3 className="line-clamp-1 text-[var(--text-caption)] font-[var(--font-display)] text-[var(--color-black-900)]">
            {title}
          </h3>
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
