/**
 * app/verify-email/page.tsx
 * RSR-APP-006
 *
 * Resora authenticates exclusively via Google Sign-In (Blueprint
 * §30.10), and Google-verified accounts already carry a verified email
 * at the provider level — Firebase Auth's emailVerified flag is true
 * for Google-federated users on first sign-in. This route is therefore
 * not a verification workflow; it exists so a bookmarked/shared
 * "/verify-email" link (e.g. from a legacy email template) resolves
 * to something useful instead of a 404, and quietly redirects a
 * verified user back to their intended destination.
 */

"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/Button";
import { useAuth } from "@/hooks/useAuth";

export default function VerifyEmailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoading } = useAuth();
  const redirectTo = searchParams.get("redirect") ?? "/";

  React.useEffect(() => {
    // Google-federated accounts are verified by construction — if we
    // already have a signed-in user here, just send them on their way.
    if (!isLoading && user) {
      router.replace(redirectTo);
    }
  }, [isLoading, user, router, redirectTo]);

  if (isLoading || user) return null;

  return (
    <>
      <Navbar transparentOverHero={false} />

      <main className="min-h-[100svh] flex items-center justify-center bg-[var(--color-black-900)] px-[var(--space-4)] pt-16">
        <div className="w-full max-w-sm flex flex-col items-center text-center gap-[var(--space-4)]">
          <h1 className="font-[var(--font-display)] text-[var(--text-h1)] text-[var(--color-ivory-100)]">
            No Separate Email Verification Needed
          </h1>
          <p className="text-[var(--text-body)] text-[var(--color-gray-300)]">
            Resora accounts sign in through Google, whose accounts are already verified — there's
            no additional email confirmation step. Sign in to continue.
          </p>

          <Link href={`/login?redirect=${encodeURIComponent(redirectTo)}`} className="w-full">
            <Button variant="primary" size="lg" fullWidth>
              Go to Sign In
            </Button>
          </Link>
        </div>
      </main>
    </>
  );
}
