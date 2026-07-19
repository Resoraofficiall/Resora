/**
 * components/ErrorState.tsx
 * RSR-CMP-008
 *
 * Calm copy + retry action slot (Blueprint §5.7) — never a stack trace,
 * never a raw error.message dumped to the user. Callers pass a
 * human-readable `message`; log the technical detail separately
 * (Firebase Crashlytics-equivalent logging per §18.5), not in this UI.
 */

import * as React from "react";
import { Button } from "@/components/Button";

export interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
}

function DefaultIllustration() {
  return (
    <svg width="72" height="72" viewBox="0 0 72 72" fill="none" aria-hidden="true">
      <circle cx="36" cy="36" r="30" stroke="var(--color-error)" strokeWidth="1.5" opacity="0.6" />
      <path d="M36 24v16" stroke="var(--color-error)" strokeWidth="2" strokeLinecap="round" />
      <circle cx="36" cy="46" r="1.75" fill="var(--color-error)" />
    </svg>
  );
}

export function ErrorState({
  title = "Something didn't load correctly",
  message = "Please try again in a moment. If the problem continues, our support team is here to help.",
  onRetry,
  retryLabel = "Try again",
  className = "",
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={[
        "flex flex-col items-center justify-center text-center",
        "px-[var(--space-4)] py-[var(--space-7)]",
        "gap-[var(--space-3)]",
        className,
      ].join(" ")}
    >
      <DefaultIllustration />

      <h3 className="font-[var(--font-display)] text-[var(--text-h3)] text-[var(--color-ivory-100)]">
        {title}
      </h3>

      <p className="max-w-sm text-[var(--text-body)] text-[var(--color-gray-500)]">{message}</p>

      {onRetry && (
        <div className="mt-[var(--space-2)]">
          <Button variant="outline" onClick={onRetry}>
            {retryLabel}
          </Button>
        </div>
      )}
    </div>
  );
}

export default ErrorState;
