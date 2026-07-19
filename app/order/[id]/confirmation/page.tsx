/**
 * app/order/[id]/confirmation/page.tsx
 * RSR-APP-016
 *
 * Order confirmation page — reached after the Razorpay webhook Cloud
 * Function (RSR-FBS-006) has verified payment and created the order
 * server-side. This page only reads the resulting order document via
 * orderService; it never assumes success from a client-side redirect
 * alone, since the webhook may still be processing when the browser
 * returns from the payment gateway.
 */

"use client";

import * as React from "react";
import Link from "next/link";
import { notFound, useParams } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/Button";
import { ErrorState } from "@/components/ErrorState";
import { formatCurrency } from "@/utils/formatCurrency";
import { getOrderById, type Order } from "@/services/orderService";

type LoadState = "loading" | "pending" | "confirmed" | "not-found" | "error";

const POLL_INTERVAL_MS = 2000;
const MAX_POLL_ATTEMPTS = 10;

export default function OrderConfirmationPage() {
  const params = useParams<{ id: string }>();
  const [order, setOrder] = React.useState<Order | null>(null);
  const [state, setState] = React.useState<LoadState>("loading");
  const attemptsRef = React.useRef(0);

  const fetchOrder = React.useCallback(async () => {
    try {
      const data = await getOrderById(params.id);
      if (!data) {
        setState("not-found");
        return;
      }
      setOrder(data);
      if (data.paymentStatus === "confirmed") {
        setState("confirmed");
      } else {
        setState("pending");
      }
    } catch {
      setState("error");
    }
  }, [params.id]);

  React.useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  // Poll briefly while the webhook finishes processing — the order
  // document itself is only ever written server-side.
  React.useEffect(() => {
    if (state !== "pending") return;
    if (attemptsRef.current >= MAX_POLL_ATTEMPTS) return;

    const timer = setTimeout(() => {
      attemptsRef.current += 1;
      fetchOrder();
    }, POLL_INTERVAL_MS);

    return () => clearTimeout(timer);
  }, [state, fetchOrder]);

  if (state === "not-found") {
    notFound();
  }

  return (
    <>
      <Navbar transparentOverHero={false} />

      <main className="min-h-[100svh] bg-[var(--color-black-900)] px-[var(--space-4)] pt-24 pb-[var(--space-9)]">
        <div className="mx-auto max-w-lg text-center">
          {(state === "loading" || state === "pending") && (
            <>
              <div className="mx-auto h-10 w-10 rounded-full border-2 border-[var(--color-gold-500)] border-t-transparent animate-spin" />
              <h1 className="mt-[var(--space-4)] font-[var(--font-display)] text-[var(--text-h2)] text-[var(--color-ivory-100)]">
                Confirming your order…
              </h1>
              <p className="mt-[var(--space-2)] text-[var(--text-body)] text-[var(--color-gray-300)]">
                This usually takes a few seconds.
              </p>
            </>
          )}

          {state === "error" && <ErrorState message="We couldn't load your order." onRetry={fetchOrder} />}

          {state === "confirmed" && order && (
            <>
              <h1 className="font-[var(--font-display)] text-[var(--text-h1)] text-[var(--color-ivory-100)]">
                Order Confirmed
              </h1>
              <p className="mt-[var(--space-2)] text-[var(--text-body)] text-[var(--color-gray-300)]">
                Thank you — your order #{order.orderNumber} has been placed.
              </p>
              <p className="mt-[var(--space-3)] text-[var(--text-h3)] text-[var(--color-gold-500)]">
                {formatCurrency(order.totalInPaise, order.currency)}
              </p>

              <div className="mt-[var(--space-6)] flex justify-center gap-[var(--space-3)]">
                <Link href={`/account/orders/${order.id}`}>
                  <Button variant="primary">View Order</Button>
                </Link>
                <Link href="/">
                  <Button variant="outline">Continue Shopping</Button>
                </Link>
              </div>
            </>
          )}
        </div>
      </main>

      <Footer />
    </>
  );
}
