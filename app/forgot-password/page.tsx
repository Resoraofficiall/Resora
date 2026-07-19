/**
 * app/forgot-password/page.tsx
 * RSR-APP-005
 *
 * Since Resora authenticates exclusively via Google Sign-In (Blueprint
 * §30.10) there is no Resora-owned password to reset. This page exists
 * as the registry's placeholder route and educates the user rather than
 * 404ing — it deliberately does not call Firebase Auth's email/password
 * reset flow, since that flow does not apply to this account model.
 */

"use client";

import Link from "next/link";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/Button";

export default function ForgotPasswordPage() {
  return (
    <>
      <Navbar transparentOverHero={false} />

      <main className="min-h-[100svh] flex items-center justify-center bg-[var(--color-black-900)] px-[var(--space-4)] pt-16">
        <div className="w-full max-w-sm flex flex-col items-center text-center gap-[var(--space-4)]">
          <h1 className="font-[var(--font-display)] text-[var(--text-h1)] text-[var(--color-ivory-100)]">
            No Password to Reset
          </h1>
          <p className="text-[var(--text-body)] text-[var(--color-gray-300)]">
            Resora accounts sign in with Google — there's no separate Resora password to
            recover. If you can't access your account, recover access through your Google
            Account settings instead.
          </p>

          <Link href="/login" className="w-full">
            <Button variant="primary" size="lg" fullWidth>
              Back to Sign In
            </Button>
          </Link>

          <a
            href="https://myaccount.google.com/security"
            target="_blank"
            rel="noreferrer noopener"
            className="text-[var(--text-caption)] text-[var(--color-gold-500)] hover:text-[var(--color-gold-600)]"
          >
            Manage your Google Account security
          </a>
        </div>
      </main>
    </>
  );
}
