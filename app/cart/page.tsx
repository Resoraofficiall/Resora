/**
 * app/cart/page.tsx
 * RSR-APP-014
 *
 * Cart page. All cart mutations go through cartService.ts (RSR-SVC-006)
 * — this component never writes to Firestore directly (§18.2). Order
 * creation itself is NOT triggered here; this page only manages line
 * items and hands off to /checkout, since order creation is a
 * security-critical operation that must happen in a Cloud Function
 * (Global Rule 4).
 */

"use client";

import * as React from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/Button";
import { SkeletonRow } from "@/components/LoadingSkeleton";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { formatCurrency } from "@/utils/formatCurrency";
import {
  getCart,
  updateCartItemQuantity,
  removeCartItem,
  type CartItem,
} from "@/services/cartService";

type LoadState = "loading" | "loaded" | "error";

export default function CartPage() {
  const [items, setItems] = React.useState<CartItem[]>([]);
  const [state, setState] = React.useState<LoadState>("loading");
  const [mutatingId, setMutatingId] = React.useState<string | null>(null);

  const fetchCart = React.useCallback(async () => {
    setState("loading");
    try {
      const data = await getCart();
      setItems(data);
      setState("loaded");
    } catch {
      setState("error");
    }
  }, []);

  React.useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  const handleQuantityChange = React.useCallback(async (itemId: string, quantity: number) => {
    if (quantity < 1) return;
    setMutatingId(itemId);
    try {
      const updated = await updateCartItemQuantity(itemId, quantity);
      setItems(updated);
    } finally {
      setMutatingId(null);
    }
  }, []);

  const handleRemove = React.useCallback(async (itemId: string) => {
    setMutatingId(itemId);
    try {
      const updated = await removeCartItem(itemId);
      setItems(updated);
    } finally {
      setMutatingId(null);
    }
  }, []);

  const subtotalInPaise = items.reduce((sum, item) => sum + item.priceInPaise * item.quantity, 0);

  return (
    <>
      <Navbar transparentOverHero={false} />

      <main className="min-h-[100svh] bg-[var(--color-black-900)] px-[var(--space-4)] md:px-[var(--space-5)] pt-24 pb-[var(--space-9)]">
        <div className="mx-auto max-w-[900px]">
          <h1 className="font-[var(--font-display)] text-[var(--text-h1)] text-[var(--color-ivory-100)]">
            Your Cart
          </h1>

          <div className="mt-[var(--space-6)]">
            {state === "loading" && (
              <div className="divide-y divide-[var(--color-charcoal-800)]">
                {Array.from({ length: 3 }).map((_, i) => (
                  <SkeletonRow key={i} />
                ))}
              </div>
            )}

            {state === "error" && <ErrorState message="We couldn't load your cart." onRetry={fetchCart} />}

            {state === "loaded" && items.length === 0 && (
              <EmptyState
                title="Your cart is empty"
                description="Discover handcrafted pieces from verified artisan studios."
                actionLabel="Browse Studios"
                actionHref="/studios"
              />
            )}

            {state === "loaded" && items.length > 0 && (
              <>
                <div className="divide-y divide-[var(--color-charcoal-800)]">
                  {items.map((item) => (
                    <div key={item.id} className="flex items-center gap-[var(--space-3)] py-[var(--space-4)]">
                      <div
                        className="h-20 w-20 shrink-0 rounded-[var(--radius-sm)] bg-[var(--color-gray-100)] bg-cover bg-center"
                        style={item.imageUrl ? { backgroundImage: `url(${item.imageUrl})` } : undefined}
                      />
                      <div className="flex-1">
                        <p className="text-[var(--text-body)] text-[var(--color-ivory-100)]">{item.title}</p>
                        <p className="text-[var(--text-caption)] text-[var(--color-gray-500)]">
                          {formatCurrency(item.priceInPaise, item.currency)}
                        </p>
                      </div>

                      <div className="flex items-center gap-[var(--space-2)]">
                        <button
                          type="button"
                          disabled={mutatingId === item.id}
                          onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
                          className="h-8 w-8 rounded-[var(--radius-sm)] border border-[var(--color-gray-500)] text-[var(--color-ivory-100)] disabled:opacity-50"
                        >
                          −
                        </button>
                        <span className="w-6 text-center text-[var(--color-ivory-100)]">{item.quantity}</span>
                        <button
                          type="button"
                          disabled={mutatingId === item.id}
                          onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                          className="h-8 w-8 rounded-[var(--radius-sm)] border border-[var(--color-gray-500)] text-[var(--color-ivory-100)] disabled:opacity-50"
                        >
                          +
                        </button>
                      </div>

                      <button
                        type="button"
                        disabled={mutatingId === item.id}
                        onClick={() => handleRemove(item.id)}
                        className="text-[var(--text-caption)] text-[var(--color-error)] disabled:opacity-50"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>

                <div className="mt-[var(--space-6)] flex items-center justify-between border-t border-[var(--color-charcoal-800)] pt-[var(--space-4)]">
                  <span className="text-[var(--text-h3)] text-[var(--color-ivory-100)]">Subtotal</span>
                  <span className="text-[var(--text-h3)] text-[var(--color-gold-500)]">
                    {formatCurrency(subtotalInPaise, items[0]?.currency ?? "INR")}
                  </span>
                </div>

                <Link href="/checkout" className="block mt-[var(--space-4)]">
                  <Button variant="primary" size="lg" fullWidth>
                    Proceed to Checkout
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}
