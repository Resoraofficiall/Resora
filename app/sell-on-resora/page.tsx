/**
 * app/sell-on-resora/page.tsx
 * RSR-APP-007
 *
 * Seller Application page (Blueprint §30.10–§30.11). The applicant must
 * already be signed in via the same Google Sign-In every buyer uses —
 * there is no separate seller signup flow at the auth layer, only this
 * application layered on top of an existing account. A signed-in user
 * with role: "customer" remains a fully functional buyer throughout the
 * entire application process — this page never restricts or gates any
 * buyer capability, it only submits an application document.
 */

"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { ErrorState } from "@/components/ErrorState";
import { useAuth } from "@/hooks/useAuth";
import { submitSellerApplication } from "@/services/studioService";

const applicationSchema = z.object({
  businessName: z.string().min(2, "Business name is required").max(80),
  primaryCategory: z.string().min(1, "Select a primary category"),
  artistStory: z.string().min(50, "Tell us at least a few sentences about your craft").max(2000),
  yearsOfExperience: z.coerce.number().min(0).max(80),
  portfolioUrl: z.string().url("Enter a valid URL").optional().or(z.literal("")),
  contactPhone: z.string().min(7, "Enter a valid phone number"),
});

type ApplicationFormValues = z.infer<typeof applicationSchema>;

export default function SellOnResoraPage() {
  const router = useRouter();
  const { user, isLoading: authLoading, signInWithGoogle } = useAuth();
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const [submitted, setSubmitted] = React.useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ApplicationFormValues>({
    resolver: zodResolver(applicationSchema),
  });

  const onSubmit = React.useCallback(
    async (values: ApplicationFormValues) => {
      if (!user) return;
      setSubmitError(null);
      try {
        await submitSellerApplication({
          uid: user.uid,
          ...values,
        });
        setSubmitted(true);
      } catch {
        setSubmitError("We couldn't submit your application. Please try again.");
      }
    },
    [user]
  );

  if (authLoading) return null;

  return (
    <>
      <Navbar transparentOverHero={false} />

      <main className="min-h-[100svh] bg-[var(--color-black-900)] px-[var(--space-4)] pt-24 pb-[var(--space-9)]">
        <div className="mx-auto max-w-xl">
          <h1 className="font-[var(--font-display)] text-[var(--text-h1)] text-[var(--color-ivory-100)] text-center">
            Sell on Resora
          </h1>
          <p className="mt-[var(--space-2)] text-[var(--text-body)] text-[var(--color-gray-300)] text-center">
            Apply to open your Studio. Your buyer account stays fully active — browsing,
            wishlisting, and purchasing are never blocked while your application is pending.
          </p>

          <Card className="mt-[var(--space-6)]" padding="lg">
            {!user ? (
              <div className="flex flex-col items-center gap-[var(--space-3)] text-center">
                <p className="text-[var(--text-body)] text-[var(--color-gray-500)]">
                  Sign in with your Resora account to apply.
                </p>
                <Button variant="primary" onClick={() => signInWithGoogle()}>
                  Continue with Google
                </Button>
              </div>
            ) : submitted ? (
              <div className="flex flex-col items-center gap-[var(--space-2)] text-center">
                <h2 className="font-[var(--font-display)] text-[var(--text-h3)] text-[var(--color-ivory-100)]">
                  Application Received
                </h2>
                <p className="text-[var(--text-body)] text-[var(--color-gray-500)]">
                  Our team will review your application. You'll be notified as soon as a decision
                  is made — in the meantime, continue browsing and shopping as usual.
                </p>
                <Button variant="outline" onClick={() => router.push("/")}>
                  Back to Home
                </Button>
              </div>
            ) : submitError ? (
              <ErrorState message={submitError} onRetry={() => setSubmitError(null)} />
            ) : (
              <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-[var(--space-4)]" noValidate>
                <Field label="Studio / Business Name" error={errors.businessName?.message}>
                  <input
                    {...register("businessName")}
                    className={inputClasses}
                    placeholder="e.g. Amber & Ash Resin Studio"
                  />
                </Field>

                <Field label="Primary Category" error={errors.primaryCategory?.message}>
                  <input
                    {...register("primaryCategory")}
                    className={inputClasses}
                    placeholder="e.g. Jewelry, Vase, Wall Art"
                  />
                </Field>

                <Field label="Your Craft, in Your Words" error={errors.artistStory?.message}>
                  <textarea
                    {...register("artistStory")}
                    className={`${inputClasses} min-h-[140px] resize-y`}
                    placeholder="Tell us about your background and what makes your work distinct."
                  />
                </Field>

                <Field label="Years of Experience" error={errors.yearsOfExperience?.message}>
                  <input type="number" {...register("yearsOfExperience")} className={inputClasses} min={0} />
                </Field>

                <Field label="Portfolio / Instagram URL (optional)" error={errors.portfolioUrl?.message}>
                  <input {...register("portfolioUrl")} className={inputClasses} placeholder="https://" />
                </Field>

                <Field label="Contact Phone" error={errors.contactPhone?.message}>
                  <input {...register("contactPhone")} className={inputClasses} placeholder="+91 " />
                </Field>

                <Button type="submit" variant="primary" size="lg" fullWidth isLoading={isSubmitting}>
                  Submit Application
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
  "h-11 w-full rounded-[var(--radius-sm)] bg-[var(--color-charcoal-800)] px-[var(--space-3)] text-[var(--text-body)] text-[var(--color-ivory-100)] placeholder:text-[var(--color-gray-500)] focus:outline-none focus:ring-2 focus:ring-[var(--color-gold-500)]";

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-[var(--space-1)]">
      <span className="text-[var(--text-caption)] text-[var(--color-gray-300)]">{label}</span>
      {children}
      {error && <span className="text-[var(--text-micro)] text-[var(--color-error)]">{error}</span>}
    </label>
  );
}
