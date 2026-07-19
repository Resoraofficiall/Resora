/**
 * app/product/[slug]/page.tsx
 * RSR-APP-010
 *
 * Public Product Detail Page. Composes product/ProductDetail.tsx
 * (RSR-PRD-009) and product/VariantSelector.tsx (RSR-PRD-010) as they
 * ship (Phase 4/5). This route owns data-fetch + layout only; all reads
 * go through productService (§18.2). The hero image/video shown here
 * must be the Canvas-Engine-framed asset generated at publish time
 * (Blueprint §30.9, Phase 4 Step 7) — never a raw unframed upload.
 */

"use client";

import * as React from "react";
import { notFound, useParams } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { SkeletonLine, SkeletonCard } from "@/components/LoadingSkeleton";
import { ErrorState } from "@/components/ErrorState";
import { Button } from "@/components/Button";
import { formatCurrency } from "@/utils/formatCurrency";
import { getProductBySlug, type Product } from "@/services/productService";
import { addToCart } from "@/services/cartService";
import { addToWishlist } from "@/services/wishlistService";
import { useAuth } from "@/hooks/useAuth";

type LoadState = "loading" | "loaded" | "not-found" | "error";

export default function ProductDetailPage() {
  const params = useParams<{ slug: string }>();
  const { user } = useAuth();
  const [product, setProduct] = React.useState<Product | null>(null);
  const [state, setState] = React.useState<LoadState>("loading");
  const [isAddingToCart, setIsAddingToCart] = React.useState(false);
  const [actionError, setActionError] = React.useState<string | null>(null);

  const fetchProduct = React.useCallback(async () => {
    setState("loading");
    try {
      const data = await getProductBySlug(params.slug);
      if (!data) {
        setState("not-found");
        return;
      }
      setProduct(data);
      setState("loaded");
    } catch {
      setState("error");
    }
  }, [params.slug]);

  React.useEffect(() => {
    fetchProduct();
  }, [fetchProduct]);

  if (state === "not-found") {
    notFound();
  }

  const handleAddToCart = React.useCallback(async () => {
    if (!product) return;
    setActionError(null);
    setIsAddingToCart(true);
    try {
      await addToCart({ productId: product.id, quantity: 1 });
    } catch {
      setActionError("We couldn't add this item to your cart. Please try again.");
    } finally {
      setIsAddingToCart(false);
    }
  }, [product]);

  const handleWishlist = React.useCallback(async () => {
    if (!product || !user) return;
    try {
      await addToWishlist({ uid: user.uid, productId: product.id });
    } catch {
      setActionError("We couldn't update your wishlist. Please try again.");
    }
  }, [product, user]);

  return (
    <>
      <Navbar transparentOverHero={false} />

      <main className="min-h-[100svh] bg-[var(--color-black-900)] px-[var(--space-4)] md:px-[var(--space-5)] pt-24 pb-[var(--space-9)]">
        <div className="mx-auto max-w-[1200px]">
          {state === "loading" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-[var(--space-6)]">
              <SkeletonCard className="aspect-square" />
              <div className="flex flex-col gap-[var(--space-3)]">
                <SkeletonLine width="60%" height="32px" />
                <SkeletonLine width="30%" height="20px" />
                <SkeletonLine width="90%" height="16px" />
                <SkeletonLine width="80%" height="16px" />
              </div>
            </div>
          )}

          {state === "error" && <ErrorState message="We couldn't load this product." onRetry={fetchProduct} />}

          {state === "loaded" && product && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-[var(--space-6)]">
              <div className="w-full aspect-square rounded-[var(--radius-md)] overflow-hidden bg-[var(--color-gray-100)]">
                {/* product/ProductDetail.tsx will replace this with the
                    full media gallery (Canvas Engine hero + photo-to-video
                    asset + variant thumbnails) once it ships. */}
                {product.heroImageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={product.heroImageUrl} alt={product.title} className="w-full h-full object-cover" />
                )}
              </div>

              <div className="flex flex-col gap-[var(--space-3)]">
                <h1 className="font-[var(--font-display)] text-[var(--text-h1)] text-[var(--color-ivory-100)]">
                  {product.title}
                </h1>
                <p className="text-[var(--text-h3)] text-[var(--color-gold-500)]">
                  {formatCurrency(product.priceInPaise, product.currency)}
                </p>
                <p className="text-[var(--text-body)] text-[var(--color-gray-300)]">{product.description}</p>

                {actionError && (
                  <p className="text-[var(--text-caption)] text-[var(--color-error)]">{actionError}</p>
                )}

                <div className="flex gap-[var(--space-3)] mt-[var(--space-2)]">
                  <Button variant="primary" size="lg" isLoading={isAddingToCart} onClick={handleAddToCart}>
                    Add to Cart
                  </Button>
                  <Button variant="outline" size="lg" onClick={handleWishlist}>
                    Wishlist
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </>
  );
}
