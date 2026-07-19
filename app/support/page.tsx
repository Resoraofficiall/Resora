/**
 * app/support/page.tsx
 * RSR-APP-019
 *
 * Support ticketing entry point (Phase 11 full system: Communication
 * System). This phase's version submits a ticket via supportTickets
 * collection through a service — no direct Firestore write, and no
 * open-ended DM to a founder/seller (Blueprint's "never open DM" rule
 * for contextual messaging applies here too: this is a ticket, not a chat).
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
import { createSupportTicket } from "@/services/messagingService";

const ticketSchema = z.object({
  subject: z.string().min(4, "Enter a subject").max(120),
  category: z.string().min(1, "Select a category"),
  message: z.string().min(10, "Please provide a few more details").max(2000),
});

type TicketFormValues = z.infer<typeof ticketSchema>;

const TICKET_CATEGORIES = ["Order Issue", "Payment", "Account", "Seller Application", "Other"] as const;

export default function SupportPage() {
  const { user, signInWithGoogle } = useAuth();
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const [submitted, setSubmitted] = React.useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<TicketFormValues>({ resolver: zodResolver(ticketSchema) });

  const onSubmit = React.useCallback(
    async (values: TicketFormValues) => {
      if (!user) return;
      setSubmitError(null);
      try {
        await createSupportTicket({ uid: user.uid, ...values });
        setSubmitted(true);
      } catch {
        setSubmitError("We couldn't submit your ticket. Please try again.");
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
            Support
          </h1>
          <p className="mt-[var(--space-2)] text-[var(--text-body)] text-[var(--color-gray-300)] text-center">
            Open a ticket and our team will get back to you.
          </p>

          <Card className="mt-[var(--space-6)]" padding="lg">
            {!user ? (
              <div className="flex flex-col items-center gap-[var(--space-3)] text-center">
                <p className="text-[var(--text-body)] text-[var(--color-gray-500)]">
                  Sign in to open a support ticket.
                </p>
                <Button variant="primary" onClick={() => signInWithGoogle()}>
                  Continue with Google
                </Button>
              </div>
            ) : submitted ? (
              <div className="flex flex-col items-center gap-[var(--space-2)] text-center">
                <h2 className="font-[var(--font-display)] text-[var(--text-h3)] text-[var(--color-black-900)]">
                  Ticket Submitted
                </h2>
                <p className="text-[var(--text-body)] text-[var(--color-gray-700)]">
                  Our team will respond to your registered email shortly.
                </p>
              </div>
            ) : submitError ? (
              <ErrorState message={submitError} onRetry={() => setSubmitError(null)} />
            ) : (
              <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-[var(--space-4)]" noValidate>
                <Field label="Subject" error={errors.subject?.message}>
                  <input {...register("subject")} className={inputClasses} />
                </Field>
                <Field label="Category" error={errors.category?.message}>
                  <select {...register("category")} className={inputClasses} defaultValue="">
                    <option value="" disabled>
                      Select a category
                    </option>
                    {TICKET_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Message" error={errors.message?.message}>
                  <textarea {...register("message")} className={`${inputClasses} min-h-[140px] resize-y`} />
                </Field>
                <Button type="submit" variant="primary" size="lg" fullWidth isLoading={isSubmitting}>
                  Submit Ticket
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
