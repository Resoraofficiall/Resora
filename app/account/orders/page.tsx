/**
 * app/account/orders/page.tsx
 * RSR-APP-021
 *
 * Customer order history. Reads exclusively through orderService.ts
 * (RSR-SVC-003) — Firestore Security Rules additionally enforce that a
 * customer can only ever read orders where buyerId == their own uid
 * (§18.2 + Global Rule 4), so this page's query scoping is defense in
 * depth, not the sole access control.
 */

"use client";

import * as React from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { SkeletonRow } from "@/components/LoadingSkeleton";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { formatCurrency } from "@/utils/formatCurrency";
import { useAuth } from "@/hooks/useAuth";
import { useRouteGuard } from "@/hooks/useRouteGuard";
import { listOrdersForBuyer, type OrderSummary } from "@/services/orderService";

type LoadState = "loading" | "loaded" | "error";

export default function AccountOrdersPage() {
  const { isAuthorized, isChecking } = useRouteGuard({ requireAuth: true });
  const { user } = useAuth();

  const [orders, setOrders] = React.useState<OrderSummary[]>([]);
  const [state, setState] = React.useState<LoadState>("loading");

  const fetchOrders = React.useCallback(async () => {
    if (!user) return;
    setState("loading");
    try {
      const data = await listOrdersForBuyer(user.uid);
      setOrders(data);
      setState("loaded");
    } catch {
      setState("error");
    }
  }, [user]);

  React.useEffect(() => {
    if (isAuthorized) fetchOrders();
  }, [isAuthorized, fetchOrders]);

  if (isChecking || !isAuthorized) return null;

  return (
    <>
      <Navbar transparentOverHero={false} />

      <main className="min-h-[100svh] bg-[var(--color-black-900)] px-[var(--space-4)] md:px-[var(--space-5)] pt-24 pb-[var(--space-9)]">
        <div className="mx-auto max-w-[900px]">
          <h1 className="font-[var(--font-display)] text-[var(--text-h1)] text-[var(--color-ivory-100)]">
            Orders
          </h1>

          <div className="mt-[var(--space-6)]">
            {state === "loading" && (
              <div className="divide-y divide-[var(--color-charcoal-800)]">
                {Array.from({ length: 4 }).map((_, i) => (
                  <SkeletonRow key={i} />
                ))}
              </div>
            )}

            {state === "error" && <ErrorState message="We couldn't load your orders." onRetry={fetchOrders} />}

            {state === "loaded" && orders.length === 0 && (
              <EmptyState
                title="No orders yet"
                description="Your purchases will appear here once you place an order."
                actionLabel="Browse Studios"
                actionHref="/studios"
              />
            )}

            {state === "loaded" && orders.length > 0 && (
              <div className="divide-y divide-[var(--color-charcoal-800)]">
                {orders.map((order) => (
                  <Link
                    key={order.id}
                    href={`/account/orders/${order.id}`}
                    className="flex items-center justify-between py-[var(--space-4)]"
                  >
                    <div>
                      <p className="text-[var(--text-body)] text-[var(--color-ivory-100)]">
                        Order #{order.orderNumber}
                      </p>
                      <p className="text-[var(--text-caption)] text-[var(--color-gray-500)]">
                        {new Date(order.createdAt).toLocaleDateString()} · {order.status}
                      </p>
                    </div>
                    <p className="text-[var(--text-body)] text-[var(--color-gold-500)]">
                      {formatCurrency(order.totalInPaise, order.currency)}
                    </p>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}
