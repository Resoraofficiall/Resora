/**
 * app/account/overview/page.tsx
 * RSR-APP-020
 *
 * Customer Dashboard root (Blueprint §"Full customer account
 * experience"). Protected route — gated by hooks/useRouteGuard.ts
 * (RSR-LIB-003), never a client-side-only check with no server backing
 * (role is enforced by Firestore Security Rules on every read this page
 * triggers, per Global Rule 4).
 */

"use client";

import * as React from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card } from "@/components/Card";
import { SkeletonLine } from "@/components/LoadingSkeleton";
import { useAuth } from "@/hooks/useAuth";
import { useRouteGuard } from "@/hooks/useRouteGuard";

const QUICK_LINKS = [
  { label: "Orders", href: "/account/orders", description: "Track and review your purchases" },
  { label: "Custom Orders", href: "/account/custom-orders", description: "Manage your custom requests" },
  { label: "Wishlist", href: "/account/wishlist", description: "Pieces you've saved" },
  { label: "Saved Studios", href: "/account/saved-studios", description: "Studios you follow" },
  { label: "Addresses", href: "/account/addresses", description: "Shipping addresses on file" },
  { label: "Recently Viewed", href: "/account/recently-viewed", description: "Pick up where you left off" },
] as const;

export default function AccountOverviewPage() {
  const { isAuthorized, isChecking } = useRouteGuard({ requireAuth: true });
  const { user } = useAuth();

  if (isChecking || !isAuthorized) {
    return (
      <>
        <Navbar transparentOverHero={false} />
        <main className="min-h-[100svh] bg-[var(--color-black-900)] px-[var(--space-4)] pt-24 pb-[var(--space-9)]">
          <div className="mx-auto max-w-[1100px]">
            <SkeletonLine width="30%" height="32px" />
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <Navbar transparentOverHero={false} />

      <main className="min-h-[100svh] bg-[var(--color-black-900)] px-[var(--space-4)] md:px-[var(--space-5)] pt-24 pb-[var(--space-9)]">
        <div className="mx-auto max-w-[1100px]">
          <h1 className="font-[var(--font-display)] text-[var(--text-h1)] text-[var(--color-ivory-100)]">
            Welcome back{user?.displayName ? `, ${user.displayName.split(" ")[0]}` : ""}
          </h1>

          <div className="mt-[var(--space-6)] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-[var(--space-4)]">
            {QUICK_LINKS.map((link) => (
              <Link key={link.href} href={link.href}>
                <Card interactive padding="lg" className="h-full">
                  <h2 className="font-[var(--font-display)] text-[var(--text-h3)] text-[var(--color-black-900)]">
                    {link.label}
                  </h2>
                  <p className="mt-[var(--space-1)] text-[var(--text-caption)] text-[var(--color-gray-700)]">
                    {link.description}
                  </p>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}
