"use client";

import { useRouteGuard } from "@/hooks/useRouteGuard";
import EmptyState from "@/components/EmptyState";

/**
 * Loyalty Points — V1 STUB (Blueprint §11.2, §1.3 "Explicitly deferred").
 * Loyalty points redemption is out of scope for V1. This route exists so
 * the account nav link resolves, the `loyaltyPoints` field on
 * users/{uid} is visible for transparency, and the schema/UI slot is
 * reserved for Phase 3+ without requiring a later route migration.
 * Do NOT wire redemption, earning rules, or a ledger UI here — that is
 * `loyaltyLedger` (reserved, inactive in V1) per Blueprint §6.1.
 */
export default function LoyaltyPage() {
  useRouteGuard({ requiredRole: "customer" });

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 md:py-16">
      <h1 className="font-display text-h1 text-black-900 mb-8">
        Loyalty Points
      </h1>

      <EmptyState
        title="Loyalty is coming soon."
        description="We're building a rewards program worth waiting for. Your purchases are already being counted — points will appear here once the program launches."
        actionLabel="Continue Shopping"
        actionHref="/studios"
      />
    </div>
  );
}
