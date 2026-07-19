import Image from "next/image";
import Link from "next/link";
import type { ProductCardVariantProps } from "../ProductCard";
import { WishlistButton, PriceBlock } from "../ProductCard";

/**
 * RSR-PRD-006 — Gallery-frame card.
 *
 * Used for: Wall Art / Frames (landscape gallery presentation), Vase /
 * Home Decor, and the default fallback for unmapped categories.
 * Per Blueprint §5.5 this is one of five category-aware presentation
 * variants sharing one base card contract.
 */
export default function GalleryFrame({
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
    <Link
      href={href}
      className={`group block ${className}`}
      aria-label={title}
    >
      <div className="relative overflow-hidden rounded-[var(--radius-md)] bg-[var(--color-ivory-50)] shadow-[var(--shadow-card)] transition-shadow duration-[var(--duration-base)] ease-[var(--ease-luxury)] group-hover:shadow-[var(--shadow-hover)]">
        {/* Thin metallic-gold gallery border, per luxury design language */}
        <div className="pointer-events-none absolute inset-0 z-[1] rounded-[var(--radius-md)] ring-1 ring-inset ring-[var(--color-gold-100)]" />

        <WishlistButton wishlisted={wishlisted} onClick={onWishlistClick} />

        <div className="relative aspect-[4/5] w-full overflow-hidden bg-[var(--color-gray-100)]">
          {image ? (
            <Image
              src={image}
              alt={title}
              fill
              sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
              priority={priority}
              onError={onImageError}
              className="object-cover transition-transform duration-[var(--duration-slow)] ease-[var(--ease-luxury)] group-hover:scale-[1.04]"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-[var(--color-gray-300)]">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <path d="M21 15l-5-5L5 21" />
              </svg>
            </div>
          )}

          {isOutOfStock && (
            <div className="absolute inset-0 bg-[var(--color-black-900)]/30" />
          )}
        </div>
      </div>

      <div className="mt-3 space-y-1 px-1">
        <h3 className="line-clamp-1 text-[var(--text-body)] font-[var(--font-display)] text-[var(--color-black-900)]">
          {title}
        </h3>

        {typeof rating === "number" && reviewCount ? (
          <div className="flex items-center gap-1 text-[var(--text-micro)] text-[var(--color-gray-500)]">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="var(--color-gold-500)">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 21 12 17.77 5.82 21 7 14.14l-5-4.87 6.91-1.01L12 2z" />
            </svg>
            <span>{rating.toFixed(1)}</span>
            <span>({reviewCount})</span>
          </div>
        ) : null}

        <PriceBlock
          priceLabel={priceLabel}
          compareAtLabel={compareAtLabel}
          isOutOfStock={isOutOfStock}
        />
      </div>
    </Link>
  );
}
