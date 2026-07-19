/**
 * app/login/page.tsx
 * RSR-APP-004
 *
 * Sign-in is Google Sign-In only — the same identical flow as
 * app/register/page.tsx (Blueprint §30.10). This page and Register
 * intentionally call the exact same useAuth().signInWithGoogle()
 * function rather than two separate implementations, since Google
 * Sign-In does not distinguish "register" from "login" at the
 * provider level — Firestore users/{uid} existence is what determines
 * new-vs-returning, handled inside the hook, not duplicated here.
 */

"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/Button";
import { ErrorState } from "@/components/ErrorState";
import { useAuth } from "@/hooks/useAuth";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, signInWithGoogle, isLoading } = useAuth();
  const [error, setError] = React.useState<string | null>(null);
  const [isSigningIn, setIsSigningIn] = React.useState(false);

  const redirectTo = searchParams.get("redirect") ?? "/";

  React.useEffect(() => {
    if (!isLoading && user) {
      router.replace(redirectTo);
    }
  }, [isLoading, user, router, redirectTo]);

  const handleSignIn = React.useCallback(async () => {
    setError(null);
    setIsSigningIn(true);
    try {
      await signInWithGoogle();
      router.replace(redirectTo);
    } catch {
      setError("We couldn't sign you in. Please try again.");
    } finally {
      setIsSigningIn(false);
    }
  }, [signInWithGoogle, router, redirectTo]);

  return (
    <>
      <Navbar transparentOverHero={false} />

      <main className="min-h-[100svh] flex items-center justify-center bg-[var(--color-black-900)] px-[var(--space-4)] pt-16">
        <div className="w-full max-w-sm flex flex-col items-center text-center gap-[var(--space-4)]">
          <h1 className="font-[var(--font-display)] text-[var(--text-h1)] text-[var(--color-ivory-100)]">
            Welcome Back
          </h1>
          <p className="text-[var(--text-body)] text-[var(--color-gray-300)]">
            Sign in with Google to continue to your account.
          </p>

          {error ? (
            <ErrorState message={error} onRetry={handleSignIn} className="py-[var(--space-4)]" />
          ) : (
            <Button
              variant="primary"
              size="lg"
              fullWidth
              isLoading={isSigningIn}
              onClick={handleSignIn}
              leftIcon={<GoogleIcon />}
            >
              Continue with Google
            </Button>
          )}

          <p className="text-[var(--text-caption)] text-[var(--color-gray-500)]">
            New to Resora?{" "}
            <Link href="/register" className="text-[var(--color-gold-500)] hover:text-[var(--color-gold-600)]">
              Create an account
            </Link>
          </p>
        </div>
      </main>
    </>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84c-.21 1.13-.85 2.09-1.8 2.73v2.27h2.92c1.7-1.57 2.68-3.88 2.68-6.64z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.17l-2.92-2.27c-.81.54-1.85.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.34C2.44 15.98 5.48 18 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.97 10.72A5.4 5.4 0 013.68 9c0-.6.1-1.18.29-1.72V4.94H.96A9 9 0 000 9c0 1.45.35 2.83.96 4.06l3.01-2.34z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.51.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0 5.48 0 2.44 2.02.96 4.94l3.01 2.34C4.68 5.16 6.66 3.58 9 3.58z"
      />
    </svg>
  );
}
