"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import type { Product, ProductVariant, Studio } from "@/types/schema";
import { formatCurrency } from "@/utils/formatCurrency";
import { useAuth } from "@/hooks/useAuth";
import { addToCart } from "@/services/cartService";
import { toggleWishlist, isWishlisted } from "@/services/wishlistService";
import { getRelatedProducts } from "@/services/productService";
import { getReviewsForProduct } from "@/services/reviewService";
import { trackRecentlyViewed } from "@/services/searchService";
import ProductCard from "./ProductCard";
import VariantSelector from "./VariantSelector";
import { WishlistButton } from "./ProductCard";
import LoadingSkeleton from "@/components/LoadingSkeleton";
import EmptyState from "@/components/EmptyState";
import ErrorState from "@/components/ErrorState";
import ShareButtons from "@/components/ShareButtons";

/**
 * RSR-PRD-009 — Product Detail Page content component.
 * Phase 5, Step 4: /product/{slug}.
 *
 * Composes Phase 4's product/card components (gallery, variant selector,
 * ProductCard for "related products") into the full public detail view:
 * gallery, video, price, variant selector, availability, quantity
 * selector, Add to Cart / Buy Now, wishlist toggle, share, story, specs,
 * reviews, related products (rule-based: same category/collection/studio,
 * per §14 — not ML), recently-viewed tracking.
 *
 * This component receives the resolved `product` + `studio` as props
 * (fetched server-side by the /product/[slug] route per Blueprint §12.2
 * SSR/ISR conventions) rather than fetching them itself, so the page
 * shell controls loading/notFound/SEO metadata.
 */

export interface ProductDetailProps {
  product: Product;
  studio: Pick<Studio, "studioId" | "name" | "slug" | "logoUrl" | "verificationBadge">;
}

export default function ProductDetail({ product, studio }: ProductDetailProps) {
  const { user } = useAuth();

  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [selection, setSelection] = useState<{
    variant: ProductVariant | null;
    unitPrice: number;
    inStock: boolean;
  }>({
    variant: null,
    unitPrice:
      typeof product.salePrice === "number" && product.salePrice > 0
        ? product.salePrice
        : product.price,
    inStock: true,
  });

  const [wishlisted, setWishlisted] = useState(false);
  const [addingToCart, setAddingToCart] = useState(false);
  const [cartError, setCartError] = useState<string | null>(null);

  const [related, setRelated] = useState<Product[] | null>(null);
  const [relatedError, setRelatedError] = useState(false);

  const [reviewSummary, setReviewSummary] = useState<{
    average: number;
    count: number;
  } | null>(null);

  const media = useMemo(
    () => [...(product.images ?? []), ...(product.videos ?? [])],
    [product.images, product.videos]
  );

  // Wishlist state
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    isWishlisted(user.uid, product.productId).then((v) => {
      if (!cancelled) setWishlisted(v);
    });
    return () => {
      cancelled = true;
    };
  }, [user, product.productId]);

  // Related products — rule-based, per §14: same category/collection/studio
  useEffect(() => {
    let cancelled = false;
    getRelatedProducts({
      productId: product.productId,
      category: product.category,
      collectionIds: product.collectionIds ?? [],
      studioId: product.studioId,
      limit: 8,
    })
      .then((items) => {
        if (!cancelled) setRelated(items);
      })
      .catch(() => {
        if (!cancelled) setRelatedError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [product.productId, product.category, product.collectionIds, product.studioId]);

  // Review summary
  useEffect(() => {
    let cancelled = false;
    getReviewsForProduct(product.productId, { limit: 1 })
      .then((res) => {
        if (!cancelled) {
          setReviewSummary({
            average: product.rating ?? res.average ?? 0,
            count: product.reviewCount ?? res.count ?? 0,
          });
        }
      })
      .catch(() => {
        if (!cancelled) setReviewSummary({ average: product.rating ?? 0, count: product.reviewCount ?? 0 });
      });
    return () => {
      cancelled = true;
    };
  }, [product.productId, product.rating, product.reviewCount]);

  // Recently viewed tracking — server-synced for signed-in users,
  // localStorage-only for anonymous visitors, per Phase 5 Step 7.
  useEffect(() => {
    trackRecentlyViewed(product.productId, user?.uid ?? null);
  }, [product.productId, user?.uid]);

  const isOutOfStock =
    product.inventoryMode === "stock" && !selection.inStock;

  const handleWishlistClick = async () => {
    if (!user) {
      // Route to sign-in — actual redirect handled by useRouteGuard/auth UI;
      // this component stays presentation-focused.
      window.location.href = `/login?redirect=/product/${product.slug}`;
      return;
    }
    const next = !wishlisted;
    setWishlisted(next);
    try {
      await toggleWishlist(user.uid, product.productId, next);
    } catch {
      setWishlisted(!next); // revert on failure
    }
  };

  const handleAddToCart = async (buyNow: boolean) => {
    if (isOutOfStock) return;
    setAddingToCart(true);
    setCartError(null);
    try {
      await addToCart({
        productId: product.productId,
        studioId: product.studioId,
        variantId: selection.variant?.id ?? null,
        name: product.name,
        unitPrice: selection.unitPrice,
        qty: quantity,
        customerId: user?.uid ?? null,
      });
      if (buyNow) {
        window.location.href = "/checkout";
      }
    } catch {
      setCartError("Couldn't add this to your bag — please try again.");
    } finally {
      setAddingToCart(false);
    }
  };

  const maxQuantity =
    product.inventoryMode === "stock"
      ? selection.variant?.inventoryCount ?? product.inventoryCount ?? 1
      : 99;

  return (
    <article className="mx-auto max-w-[1280px] px-4 py-8 md:px-8 md:py-12">
      <div className="grid grid-cols-1 gap-10 md:grid-cols-2 md:gap-14">
        {/* Gallery */}
        <div className="space-y-3">
          <div className="relative aspect-[4/5] w-full overflow-hidden rounded-[var(--radius-lg)] bg-[var(--color-gray-100)] shadow-[var(--shadow-card)]">
            {media[activeImageIndex] ? (
              <Image
                src={media[activeImageIndex]}
                alt={product.name}
                fill
                priority
                sizes="(min-width: 768px) 50vw, 100vw"
                className="object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-[var(--color-gray-300)]">
                No image available
              </div>
            )}
            <div className="absolute right-4 top-4">
              <WishlistButton wishlisted={wishlisted} onClick={handleWishlistClick} />
            </div>
          </div>

          {media.length > 1 && (
            <div className="flex gap-2 overflow-x-auto">
              {media.map((src, i) => (
                <button
                  key={src + i}
                  type="button"
                  onClick={() => setActiveImageIndex(i)}
                  aria-label={`View image ${i + 1}`}
                  className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-[var(--radius-sm)] ring-1 transition-all duration-[var(--duration-fast)] ${
                    i === activeImageIndex
                      ? "ring-2 ring-[var(--color-gold-500)]"
                      : "ring-[var(--color-gray-300)]"
                  }`}
                >
                  <Image src={src} alt="" fill sizes="64px" className="object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="space-y-6">
          <div className="space-y-2">
            <a
              href={`/studio/${studio.slug}`}
              className="inline-flex items-center gap-2 text-[var(--text-caption)] text-[var(--color-gray-700)] hover:text-[var(--color-gold-600)]"
            >
              {studio.logoUrl && (
                <span className="relative h-5 w-5 overflow-hidden rounded-full">
                  <Image src={studio.logoUrl} alt="" fill sizes="20px" className="object-cover" />
                </span>
              )}
              {studio.name}
              {studio.verificationBadge && studio.verificationBadge !== "none" && (
                <span className="text-[var(--color-gold-500)]">✓</span>
              )}
            </a>

            <h1 className="font-[var(--font-display)] text-[var(--text-h1)] text-[var(--color-black-900)]">
              {product.name}
            </h1>

            {reviewSummary && reviewSummary.count > 0 && (
              <div className="flex items-center gap-1 text-[var(--text-caption)] text-[var(--color-gray-700)]">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="var(--color-gold-500)">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 21 12 17.77 5.82 21 7 14.14l-5-4.87 6.91-1.01L12 2z" />
                </svg>
                <span>{reviewSummary.average.toFixed(1)}</span>
                <span className="text-[var(--color-gray-500)]">
                  ({reviewSummary.count} review{reviewSummary.count === 1 ? "" : "s"})
                </span>
              </div>
            )}
          </div>

          <div className="flex items-baseline gap-3">
            <span className="text-[var(--text-h2)] font-medium text-[var(--color-black-900)]">
              {formatCurrency(selection.unitPrice)}
            </span>
            {typeof product.salePrice === "number" &&
              product.salePrice > 0 &&
              product.salePrice < product.price && (
                <span className="text-[var(--text-body)] text-[var(--color-gray-500)] line-through">
                  {formatCurrency(product.price)}
                </span>
              )}
          </div>

          {product.shortDescription && (
            <p className="text-[var(--text-body-lg)] text-[var(--color-gray-700)]">
              {product.shortDescription}
            </p>
          )}

          <VariantSelector product={product} onChange={setSelection} />

          {/* Quantity */}
          <div className="space-y-2">
            <span className="text-[var(--text-caption)] font-medium uppercase tracking-wide text-[var(--color-gray-700)]">
              Quantity
            </span>
            <div className="flex w-fit items-center rounded-[var(--radius-sm)] border border-[var(--color-gray-300)]">
              <button
                type="button"
                aria-label="Decrease quantity"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="px-3 py-2 text-[var(--color-gray-700)] hover:text-[var(--color-black-900)]"
              >
                −
              </button>
              <span className="min-w-[2ch] text-center text-[var(--text-body)]">{quantity}</span>
              <button
                type="button"
                aria-label="Increase quantity"
                onClick={() => setQuantity((q) => Math.min(maxQuantity, q + 1))}
                className="px-3 py-2 text-[var(--color-gray-700)] hover:text-[var(--color-black-900)]"
              >
                +
              </button>
            </div>
          </div>

          {isOutOfStock ? (
            <div className="rounded-[var(--radius-sm)] bg-[var(--color-gray-100)] px-4 py-3 text-[var(--text-caption)] text-[var(--color-gray-700)]">
              Currently out of stock.
            </div>
          ) : (
            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                disabled={addingToCart}
                onClick={() => handleAddToCart(false)}
                className="flex-1 rounded-[var(--radius-sm)] border border-[var(--color-black-900)] bg-transparent px-6 py-3 text-[var(--text-body)] font-medium text-[var(--color-black-900)] transition-all duration-[var(--duration-fast)] ease-[var(--ease-luxury)] hover:bg-[var(--color-black-900)] hover:text-[var(--color-ivory-50)] disabled:opacity-50"
              >
                Add to Bag
              </button>
              <button
                type="button"
                disabled={addingToCart}
                onClick={() => handleAddToCart(true)}
                className="flex-1 rounded-[var(--radius-sm)] bg-[var(--color-gold-500)] px-6 py-3 text-[var(--text-body)] font-medium text-[var(--color-black-900)] transition-all duration-[var(--duration-fast)] ease-[var(--ease-luxury)] hover:bg-[var(--color-gold-600)] hover:shadow-[var(--shadow-gold-glow)] disabled:opacity-50"
              >
                Buy Now
              </button>
            </div>
          )}

          {cartError && (
            <p className="text-[var(--text-caption)] text-[var(--color-error)]">{cartError}</p>
          )}

          <ShareButtons url={`/product/${product.slug}`} title={product.name} />

          {/* Story */}
          {product.story && (
            <div className="space-y-2 border-t border-[var(--color-gray-100)] pt-6">
              <h2 className="font-[var(--font-display)] text-[var(--text-h3)] text-[var(--color-black-900)]">
                The Story
              </h2>
              <p className="whitespace-pre-line text-[var(--text-body)] text-[var(--color-gray-700)]">
                {product.story}
              </p>
            </div>
          )}

          {/* Specs */}
          <div className="space-y-2 border-t border-[var(--color-gray-100)] pt-6">
            <h2 className="font-[var(--font-display)] text-[var(--text-h3)] text-[var(--color-black-900)]">
              Details
            </h2>
            <dl className="grid grid-cols-2 gap-y-2 text-[var(--text-caption)]">
              {product.materials && (
                <>
                  <dt className="text-[var(--color-gray-500)]">Materials</dt>
                  <dd className="text-[var(--color-black-900)]">{product.materials}</dd>
                </>
              )}
              {product.dimensions && (
                <>
                  <dt className="text-[var(--color-gray-500)]">Dimensions</dt>
                  <dd className="text-[var(--color-black-900)]">{product.dimensions}</dd>
                </>
              )}
              {product.weight && (
                <>
                  <dt className="text-[var(--color-gray-500)]">Weight</dt>
                  <dd className="text-[var(--color-black-900)]">{product.weight}</dd>
                </>
              )}
              {typeof product.productionTimeDays === "number" && (
                <>
                  <dt className="text-[var(--color-gray-500)]">Production time</dt>
                  <dd className="text-[var(--color-black-900)]">
                    {product.productionTimeDays} day{product.productionTimeDays === 1 ? "" : "s"}
                  </dd>
                </>
              )}
              {typeof product.shippingTimeDays === "number" && (
                <>
                  <dt className="text-[var(--color-gray-500)]">Shipping time</dt>
                  <dd className="text-[var(--color-black-900)]">
                    {product.shippingTimeDays} day{product.shippingTimeDays === 1 ? "" : "s"}
                  </dd>
                </>
              )}
            </dl>
          </div>
        </div>
      </div>

      {/* Related products — rule-based per §14 */}
      <section className="mt-16 space-y-6">
        <h2 className="font-[var(--font-display)] text-[var(--text-h2)] text-[var(--color-black-900)]">
          You may also like
        </h2>

        {related === null && !relatedError && (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <LoadingSkeleton key={i} variant="card" />
            ))}
          </div>
        )}

        {relatedError && (
          <ErrorState
            message="Couldn't load related pieces."
            onRetry={() => window.location.reload()}
          />
        )}

        {related && related.length === 0 && (
          <EmptyState
            title="No related pieces yet"
            description="Explore more from this Studio or category."
            actionLabel="Browse Studios"
            actionHref="/studios"
          />
        )}

        {related && related.length > 0 && (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {related.map((p) => (
              <ProductCard key={p.productId} product={p} />
            ))}
          </div>
        )}
      </section>
    </article>
  );
}
