/**
 * app/account/orders/[id]/page.tsx
 * RSR-APP-022
 *
 * Single order detail + tracking (Phase 7, Order Lifecycle &
 * Fulfillment). Order status transitions are never written from this
 * page — they're read-only here, driven exclusively by
 * updateOrderStatus.ts (RSR-FBS-007) on the server side (Global Rule 4).
 */

"use client";

import * as React from "react";
import { notFound, useParams } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { SkeletonLine, SkeletonRow } from "@/components/LoadingSkeleton";
import { ErrorState } from "@/components/ErrorState";
import { formatCurrency } from "@/utils/formatCurrency";
import { useRouteGuard } from "@/hooks/useRouteGuard";
import { getOrderById, type Order } from "@/services/orderService";

type LoadState = "loading" | "loaded" | "not-found" | "error";

const STATUS_LABELS: Record<string, string> = {
  pending: "Payment Pending",
  confirmed: "Confirmed",
  in_production: "In Production",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

export default function AccountOrderDetailPage() {
  const params = useParams<{ id: string }>();
  const { isAuthorized, isChecking } = useRouteGuard({ requireAuth: true });

  const [order, setOrder] = React.useState<Order | null>(null);
  const [state, setState] = React.useState<LoadState>("loading");

  const fetchOrder = React.useCallback(async () => {
    setState("loading");
    try {
      const data = await getOrderById(params.id);
      if (!data) {
        setState("not-found");
        return;
      }
      setOrder(data);
      setState("loaded");
    } catch {
      setState("error");
    }
  }, [params.id]);

  React.useEffect(() => {
    if (isAuthorized) fetchOrder();
  }, [isAuthorized, fetchOrder]);

  if (isChecking || !isAuthorized) return null;
  if (state === "not-found") notFound();

  return (
    <>
      <Navbar transparentOverHero={false} />

      <main className="min-h-[100svh] bg-[var(--color-black-900)] px-[var(--space-4)] pt-24 pb-[var(--space-9)]">
        <div className="mx-auto max-w-[900px]">
          {state === "loading" && (
            <>
              <SkeletonLine width="40%" height="32px" />
              <div className="mt-[var(--space-4)] divide-y divide-[var(--color-charcoal-800)]">
                {Array.from({ length: 3 }).map((_, i) => (
                  <SkeletonRow key={i} />
                ))}
              </div>
            </>
          )}

          {state === "error" && <ErrorState message="We couldn't load this order." onRetry={fetchOrder} />}

          {state === "loaded" && order && (
            <>
              <div className="flex items-center justify-between">
                <h1 className="font-[var(--font-display)] text-[var(--text-h1)] text-[var(--color-ivory-100)]">
                  Order #{order.orderNumber}
                </h1>
                <span className="rounded-[var(--radius-full)] bg-[var(--color-gold-100)] px-[var(--space-3)] py-[var(--space-1)] text-[var(--text-caption)] text-[var(--color-black-900)]">
                  {STATUS_LABELS[order.status] ?? order.status}
                </span>
              </div>

              <div className="mt-[var(--space-6)] divide-y divide-[var(--color-charcoal-800)]">
                {order.items.map((item) => (
                  <div key={item.productId} className="flex items-center gap-[var(--space-3)] py-[var(--space-3)]">
                    <div
                      className="h-16 w-16 shrink-0 rounded-[var(--radius-sm)] bg-[var(--color-gray-100)] bg-cover bg-center"
                      style={item.imageUrl ? { backgroundImage: `url(${item.imageUrl})` } : undefined}
                    />
                    <div className="flex-1">
                      <p className="text-[var(--text-body)] text-[var(--color-ivory-100)]">{item.title}</p>
                      <p className="text-[var(--text-caption)] text-[var(--color-gray-500)]">Qty {item.quantity}</p>
                    </div>
                    <p className="text-[var(--text-body)] text-[var(--color-gray-300)]">
                      {formatCurrency(item.priceInPaise * item.quantity, order.currency)}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-[var(--space-4)] flex justify-between border-t border-[var(--color-charcoal-800)] pt-[var(--space-3)]">
                <span className="text-[var(--text-h3)] text-[var(--color-ivory-100)]">Total</span>
                <span className="text-[var(--text-h3)] text-[var(--color-gold-500)]">
                  {formatCurrency(order.totalInPaise, order.currency)}
                </span>
              </div>

              {order.shippingAddress && (
                <div className="mt-[var(--space-6)]">
                  <h2 className="text-[var(--text-caption)] uppercase text-[var(--color-gray-500)]">
                    Shipping Address
                  </h2>
                  <p className="mt-[var(--space-1)] text-[var(--text-body)] text-[var(--color-ivory-100)]">
                    {order.shippingAddress.fullName}, {order.shippingAddress.line1}
                    {order.shippingAddress.line2 ? `, ${order.shippingAddress.line2}` : ""},{" "}
                    {order.shippingAddress.city}, {order.shippingAddress.state}{" "}
                    {order.shippingAddress.postalCode}
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      <Footer />
    </>
  );
}
