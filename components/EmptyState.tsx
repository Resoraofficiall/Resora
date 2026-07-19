/**
 * components/EmptyState.tsx
 * RSR-CMP-007
 *
 * Reusable across every future list view (Blueprint §5.7). Illustration
 * slot + message + CTA slot — never a bare "No data" string. This is
 * also the exact component the Phase 3.5 Seller Selection Gallery must
 * use for the zero-approved-studios case (Blueprint §30.7), so its API
 * stays generic rather than gallery-specific.
 */

import * as React from "react";
import { Button, type ButtonProps } from "@/components/Button";

export interface EmptyStateProps {
  illustration?: React.ReactNode;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  actionHref?: string;
  actionVariant?: ButtonProps["variant"];
  className?: string;
}

function DefaultIllustration() {
  return (
    <svg width="96" height="96" viewBox="0 0 96 96" fill="none" aria-hidden="true">
      <circle cx="48" cy="48" r="40" stroke="var(--color-gray-300)" strokeWidth="1.5" />
      <path
        d="M32 58c4-6 12-10 16-10s12 4 16 10"
        stroke="var(--color-gray-300)"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle cx="40" cy="40" r="3" fill="var(--color-gray-300)" />
      <circle cx="56" cy="40" r="3" fill="var(--color-gray-300)" />
    </svg>
  );
}

export function EmptyState({
  illustration,
  title,
  description,
  actionLabel,
  onAction,
  actionHref,
  actionVariant = "outline",
  className = "",
}: EmptyStateProps) {
  return (
    <div
      role="status"
      className={[
        "flex flex-col items-center justify-center text-center",
        "px-[var(--space-4)] py-[var(--space-8)]",
        "gap-[var(--space-3)]",
        className,
      ].join(" ")}
    >
      <div className="text-[var(--color-gray-300)]">{illustration ?? <DefaultIllustration />}</div>

      <h3 className="font-[var(--font-display)] text-[var(--text-h3)] text-[var(--color-ivory-100)]">
        {title}
      </h3>

      {description && (
        <p className="max-w-sm text-[var(--text-body)] text-[var(--color-gray-500)]">{description}</p>
      )}

      {actionLabel && (onAction || actionHref) && (
        <div className="mt-[var(--space-2)]">
          {actionHref ? (
            <Button variant={actionVariant} onClick={onAction}>
              <a href={actionHref}>{actionLabel}</a>
            </Button>
          ) : (
            <Button variant={actionVariant} onClick={onAction}>
              {actionLabel}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

export default EmptyState;
