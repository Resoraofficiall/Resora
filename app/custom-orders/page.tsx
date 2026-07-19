/**
 * app/custom-orders/page.tsx
 * RSR-APP-017
 *
 * Custom Orders landing/request page — entry point to the request →
 * quote → payment → production workflow (Phase 8). This page only
 * builds the initial request; quote negotiation and production
 * tracking live under /account/custom-orders (RSR-APP-023) and
 * /studio-admin/custom-orders (RSR-APP-035) once those phases ship.
 */

"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { ErrorState } from "@/components/ErrorState";
import { useAuth } from "@/hooks/useAuth";
import { submitCustomOrderRequest } from "@/services/customOrderService";

const requestSchema = z.object({
  category: z.string().min(1, "Select a category"),
  description: z.string().min(20, "Describe what you'd like in a bit more detail").max(2000),
  budgetRange: z.string().min(1, "Select a budget range"),
  timeline: z.string().min(1, "Select a timeline"),
});

type RequestFormValues = z.infer<typeof requestSchema>;

export default function CustomOrdersPage() {
  const { user, signInWithGoogle } = useAuth();
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const [submitted, setSubmitted] = React.useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RequestFormValues>({ resolver: zodResolver(requestSchema) });

  const onSubmit = React.useCallback(
    async (values: RequestFormValues) => {
      if (!user) return;
      setSubmitError(null);
      try {
        await submitCustomOrderRequest({ uid: user.uid, ...values });
        setSubmitted(true);
      } catch {
        setSubmitError("We couldn't submit your request. Please try again.");
      }
    },
    [user]
  );

  return (
    <>
      <Navbar transparentOverHero={false} />

      <main className="min-h-[100svh] bg-[var(--color-black-900)] px-[var(--space-4)] pt-24 pb-[var(--space-9)]">
        <div className="mx-auto max-w-xl">
          <h1 className="font-[var(--font-display)] text-[var(--text-h1)] text-[var(--color-ivory-100)] text-center">
            Custom Orders
          </h1>
          <p className="mt-[var(--space-2)] text-[var(--text-body)] text-[var(--color-gray-300)] text-center">
            Describe what you have in mind. A verified studio will send you a quote.
          </p>

          <Card className="mt-[var(--space-6)]" padding="lg">
            {!user ? (
              <div className="flex flex-col items-center gap-[var(--space-3)] text-center">
                <p className="text-[var(--text-body)] text-[var(--color-gray-500)]">
                  Sign in to submit a custom order request.
                </p>
                <Button variant="primary" onClick={() => signInWithGoogle()}>
                  Continue with Google
                </Button>
              </div>
            ) : submitted ? (
              <div className="flex flex-col items-center gap-[var(--space-2)] text-center">
                <h2 className="font-[var(--font-display)] text-[var(--text-h3)] text-[var(--color-black-900)]">
                  Request Sent
                </h2>
                <p className="text-[var(--text-body)] text-[var(--color-gray-700)]">
                  You'll receive quotes from interested studios. Track this request from your account.
                </p>
              </div>
            ) : submitError ? (
              <ErrorState message={submitError} onRetry={() => setSubmitError(null)} />
            ) : (
              <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-[var(--space-4)]" noValidate>
                <Field label="Category" error={errors.category?.message}>
                  <input {...register("category")} className={inputClasses} placeholder="e.g. Custom Jewelry" />
                </Field>
                <Field label="Describe Your Idea" error={errors.description?.message}>
                  <textarea
                    {...register("description")}
                    className={`${inputClasses} min-h-[140px] resize-y`}
                    placeholder="Colors, size, occasion, inspiration…"
                  />
                </Field>
                <Field label="Budget Range" error={errors.budgetRange?.message}>
                  <input {...register("budgetRange")} className={inputClasses} placeholder="e.g. ₹5,000–₹10,000" />
                </Field>
                <Field label="Timeline" error={errors.timeline?.message}>
                  <input {...register("timeline")} className={inputClasses} placeholder="e.g. Within 3 weeks" />
                </Field>
                <Button type="submit" variant="primary" size="lg" fullWidth isLoading={isSubmitting}>
                  Submit Request
                </Button>
              </form>
            )}
          </Card>
        </div>
      </main>

      <Footer />
    </>
  );
}

const inputClasses =
  "h-11 w-full rounded-[var(--radius-sm)] border border-[var(--color-gray-300)] px-[var(--space-3)] text-[var(--text-body)] text-[var(--color-black-900)]";

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-[var(--space-1)]">
      <span className="text-[var(--text-caption)] text-[var(--color-gray-700)]">{label}</span>
      {children}
      {error && <span className="text-[var(--text-micro)] text-[var(--color-error)]">{error}</span>}
    </label>
  );
}
