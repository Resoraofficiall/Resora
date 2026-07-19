/**
 * app/account/custom-orders/page.tsx
 * RSR-APP-023
 *
 * Customer-side tracking for the full request → quote → payment →
 * production workflow (Phase 8). Quote acceptance/payment triggers are
 * initiated from here but always finalized server-side, mirroring the
 * checkout rule (Global Rule 4) — accepting a quote never writes a
 * "confirmed" status directly from the client.
 */

"use client";

import * as React from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/Button";
import { SkeletonRow } from "@/components/LoadingSkeleton";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { formatCurrency } from "@/utils/formatCurrency";
import { useAuth } from "@/hooks/useAuth";
import { useRouteGuard } from "@/hooks/useRouteGuard";
import {
  listCustomOrdersForBuyer,
  acceptCustomOrderQuote,
  type CustomOrderRequest,
} from "@/services/customOrderService";

type LoadState = "loading" | "loaded" | "error";

const STATUS_LABELS: Record<string, string> = {
  requested: "Awaiting Quote",
  quoted: "Quote Received",
  accepted: "Accepted — Payment Pending",
  in_production: "In Production",
  completed: "Completed",
  declined: "Declined",
};

export default function AccountCustomOrdersPage() {
  const { isAuthorized, isChecking } = useRouteGuard({ requireAuth: true });
  const { user } = useAuth();

  const [requests, setRequests] = React.useState<CustomOrderRequest[]>([]);
  const [state, setState] = React.useState<LoadState>("loading");
  const [acceptingId, setAcceptingId] = React.useState<string | null>(null);

  const fetchRequests = React.useCallback(async () => {
    if (!user) return;
    setState("loading");
    try {
      const data = await listCustomOrdersForBuyer(user.uid);
      setRequests(data);
      setState("loaded");
    } catch {
      setState("error");
    }
  }, [user]);

  React.useEffect(() => {
    if (isAuthorized) fetchRequests();
  }, [isAuthorized, fetchRequests]);

  const handleAcceptQuote = React.useCallback(
    async (requestId: string) => {
      setAcceptingId(requestId);
      try {
        // Server verifies the quote and moves the request into a
        // payment-pending state — this call never marks it "accepted"
        // client-side on its own.
        const { checkoutUrl } = await acceptCustomOrderQuote(requestId);
        window.location.href = checkoutUrl;
      } finally {
        setAcceptingId(null);
      }
    },
    []
  );

  if (isChecking || !isAuthorized) return null;

  return (
    <>
      <Navbar transparentOverHero={false} />

      <main className="min-h-[100svh] bg-[var(--color-black-900)] px-[var(--space-4)] pt-24 pb-[var(--space-9)]">
        <div className="mx-auto max-w-[900px]">
          <h1 className="font-[var(--font-display)] text-[var(--text-h1)] text-[var(--color-ivory-100)]">
            Custom Orders
          </h1>

          <div className="mt-[var(--space-6)]">
            {state === "loading" && (
              <div className="divide-y divide-[var(--color-charcoal-800)]">
                {Array.from({ length: 3 }).map((_, i) => (
                  <SkeletonRow key={i} />
                ))}
              </div>
            )}

            {state === "error" && <ErrorState message="We couldn't load your custom orders." onRetry={fetchRequests} />}

            {state === "loaded" && requests.length === 0 && (
              <EmptyState
                title="No custom order requests yet"
                description="Start a request to work directly with an artisan studio."
                actionLabel="Start a Custom Order"
                actionHref="/custom-orders"
              />
            )}

            {state === "loaded" && requests.length > 0 && (
              <div className="divide-y divide-[var(--color-charcoal-800)]">
                {requests.map((request) => (
                  <div key={request.id} className="flex items-center justify-between py-[var(--space-4)] gap-[var(--space-3)]">
                    <div>
                      <p className="text-[var(--text-body)] text-[var(--color-ivory-100)]">{request.category}</p>
                      <p className="text-[var(--text-caption)] text-[var(--color-gray-500)]">
                        {STATUS_LABELS[request.status] ?? request.status}
                      </p>
                    </div>

                    {request.status === "quoted" && request.quotedPriceInPaise != null ? (
                      <Button
                        variant="primary"
                        isLoading={acceptingId === request.id}
                        onClick={() => handleAcceptQuote(request.id)}
                      >
                        Accept {formatCurrency(request.quotedPriceInPaise, "INR")}
                      </Button>
                    ) : (
                      <span className="text-[var(--text-caption)] text-[var(--color-gray-500)]">
                        {request.status === "requested" ? "Waiting on studio" : ""}
                      </span>
                    )}
                  </div>
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
