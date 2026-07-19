/**
 * app/corporate/page.tsx
 * RSR-APP-018
 *
 * Corporate gifting / bulk-order landing page. Leads captured here feed
 * corporateLeads (Firestore collection, Blueprint §6.1) and surface in
 * /admin/marketing/corporate-leads (RSR-APP-051, Phase 12) — this page
 * only submits a lead, it never creates an order directly.
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
import { submitCorporateLead } from "@/services/cmsService";

const leadSchema = z.object({
  companyName: z.string().min(2, "Company name is required").max(120),
  contactName: z.string().min(2, "Contact name is required").max(80),
  workEmail: z.string().email("Enter a valid work email"),
  phone: z.string().min(7, "Enter a valid phone number"),
  estimatedQuantity: z.coerce.number().min(1, "Enter an estimated quantity"),
  occasion: z.string().min(2, "Tell us the occasion, e.g. Diwali gifting").max(200),
});

type LeadFormValues = z.infer<typeof leadSchema>;

export default function CorporatePage() {
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const [submitted, setSubmitted] = React.useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LeadFormValues>({ resolver: zodResolver(leadSchema) });

  const onSubmit = React.useCallback(async (values: LeadFormValues) => {
    setSubmitError(null);
    try {
      await submitCorporateLead(values);
      setSubmitted(true);
    } catch {
      setSubmitError("We couldn't submit your enquiry. Please try again.");
    }
  }, []);

  return (
    <>
      <Navbar transparentOverHero={false} />

      <main className="min-h-[100svh] bg-[var(--color-black-900)] px-[var(--space-4)] pt-24 pb-[var(--space-9)]">
        <div className="mx-auto max-w-xl">
          <h1 className="font-[var(--font-display)] text-[var(--text-h1)] text-[var(--color-ivory-100)] text-center">
            Corporate Gifting
          </h1>
          <p className="mt-[var(--space-2)] text-[var(--text-body)] text-[var(--color-gray-300)] text-center">
            Handcrafted resin pieces for your team, clients, or event — curated at scale.
          </p>

          <Card className="mt-[var(--space-6)]" padding="lg">
            {submitted ? (
              <div className="flex flex-col items-center gap-[var(--space-2)] text-center">
                <h2 className="font-[var(--font-display)] text-[var(--text-h3)] text-[var(--color-black-900)]">
                  Enquiry Received
                </h2>
                <p className="text-[var(--text-body)] text-[var(--color-gray-700)]">
                  Our corporate gifting team will reach out to your work email shortly.
                </p>
              </div>
            ) : submitError ? (
              <ErrorState message={submitError} onRetry={() => setSubmitError(null)} />
            ) : (
              <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-[var(--space-4)]" noValidate>
                <Field label="Company Name" error={errors.companyName?.message}>
                  <input {...register("companyName")} className={inputClasses} />
                </Field>
                <Field label="Contact Name" error={errors.contactName?.message}>
                  <input {...register("contactName")} className={inputClasses} />
                </Field>
                <Field label="Work Email" error={errors.workEmail?.message}>
                  <input type="email" {...register("workEmail")} className={inputClasses} />
                </Field>
                <Field label="Phone" error={errors.phone?.message}>
                  <input {...register("phone")} className={inputClasses} />
                </Field>
                <Field label="Estimated Quantity" error={errors.estimatedQuantity?.message}>
                  <input type="number" min={1} {...register("estimatedQuantity")} className={inputClasses} />
                </Field>
                <Field label="Occasion" error={errors.occasion?.message}>
                  <input {...register("occasion")} className={inputClasses} placeholder="e.g. Diwali gifting" />
                </Field>
                <Button type="submit" variant="primary" size="lg" fullWidth isLoading={isSubmitting}>
                  Submit Enquiry
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
