import Image from "next/image";
import Link from "next/link";
import type { ProductCardVariantProps } from "../ProductCard";
import { WishlistButton, PriceBlock } from "../ProductCard";

/**
 * RSR-PRD-003 — Circular-frame card.
 * Used for: Clocks, per §30.9.1's category → frame preset table.
 * The product photo is masked into a circle (clock face metaphor) inside
 * a square card shell, with the metadata block below — keeps the grid's
 * row height consistent with the other variants even though the image
 * itself is circular.
 */
export default function CircularFrame({
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

        <div className="relative flex aspect-square w-full items-center justify-center bg-[var(--color-gray-100)] p-6">
          {/* Thin metallic-gradient ring around the circular product mask */}
          <div className="relative aspect-square w-[78%] overflow-hidden rounded-full ring-1 ring-[var(--color-gold-100)] shadow-[var(--shadow-card)]">
            {image ? (
              <Image
                src={image}
                alt={title}
                fill
                sizes="(min-width: 1024px) 20vw, 40vw"
                priority={priority}
                onError={onImageError}
                className="object-cover transition-transform duration-[var(--duration-slow)] ease-[var(--ease-luxury)] group-hover:scale-[1.05]"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-[var(--color-gray-100)] text-[var(--color-gray-300)]">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 7v5l3 3" />
                </svg>
              </div>
            )}

            {isOutOfStock && (
              <div className="absolute inset-0 rounded-full bg-[var(--color-black-900)]/30" />
            )}
          </div>
        </div>

        <div className="space-y-1 px-4 pb-4 text-center">
          <h3 className="line-clamp-1 text-[var(--text-body)] font-[var(--font-display)] text-[var(--color-black-900)]">
            {title}
          </h3>

          {typeof rating === "number" && reviewCount ? (
            <div className="flex items-center justify-center gap-1 text-[var(--text-micro)] text-[var(--color-gray-500)]">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="var(--color-gold-500)">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 21 12 17.77 5.82 21 7 14.14l-5-4.87 6.91-1.01L12 2z" />
              </svg>
              <span>{rating.toFixed(1)}</span>
              <span>({reviewCount})</span>
            </div>
          ) : null}

          <div className="flex justify-center">
            <PriceBlock
              priceLabel={priceLabel}
              compareAtLabel={compareAtLabel}
              isOutOfStock={isOutOfStock}
            />
          </div>
        </div>
      </div>
    </Link>
  );
}
