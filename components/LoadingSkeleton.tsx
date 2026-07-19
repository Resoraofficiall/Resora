/**
 * components/LoadingSkeleton.tsx
 * RSR-CMP-006
 *
 * Generic, reusable loading state (Blueprint §5.7) — matches the final
 * layout shape it stands in for. Never a spinner. Every future list
 * view (search, wishlist, orders, reviews, studio directory, product
 * grid, etc.) composes its loading state from these primitives instead
 * of hand-rolling a new shimmer block per page.
 */

"use client";

import * as React from "react";

function shimmerClasses(extra = "") {
  return [
    "relative overflow-hidden rounded-[var(--radius-sm)]",
    "bg-[var(--color-gray-100)]",
    "before:absolute before:inset-0",
    "before:-translate-x-full before:animate-[skeleton-shimmer_1.6s_ease-luxury_infinite]",
    "before:bg-gradient-to-r before:from-transparent before:via-[var(--color-ivory-50)]/60 before:to-transparent",
    extra,
  ].join(" ");
}

export interface SkeletonLineProps {
  width?: string; // e.g. "60%", "180px"
  height?: string;
  className?: string;
}

export function SkeletonLine({ width = "100%", height = "16px", className = "" }: SkeletonLineProps) {
  return <div className={shimmerClasses(className)} style={{ width, height }} aria-hidden="true" />;
}

export interface SkeletonCircleProps {
  size?: string;
  className?: string;
}

export function SkeletonCircle({ size = "48px", className = "" }: SkeletonCircleProps) {
  return (
    <div
      className={shimmerClasses(`rounded-[var(--radius-full)] ${className}`)}
      style={{ width: size, height: size }}
      aria-hidden="true"
    />
  );
}

/** Matches the shape of a base Card (components/Card.tsx) with an image + two text lines. */
export function SkeletonCard({ className = "" }: { className?: string }) {
  return (
    <div
      className={[
        "bg-[var(--color-ivory-50)] rounded-[var(--radius-md)] shadow-[var(--shadow-card)]",
        "p-[var(--space-3)] flex flex-col gap-[var(--space-3)]",
        className,
      ].join(" ")}
      aria-hidden="true"
    >
      <div className={shimmerClasses("w-full aspect-square")} />
      <SkeletonLine width="70%" height="18px" />
      <SkeletonLine width="40%" height="14px" />
    </div>
  );
}

/** Grid of SkeletonCard — drop-in replacement for any product/studio grid while data loads. */
export function SkeletonGrid({ count = 8, className = "" }: { count?: number; className?: string }) {
  return (
    <div
      role="status"
      aria-label="Loading content"
      className={[
        "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-[var(--space-4)]",
        className,
      ].join(" ")}
    >
      {Array.from({ length: count }).map((_, index) => (
        <SkeletonCard key={index} />
      ))}
    </div>
  );
}

/** Matches a single row in a list/table view (e.g. order history, review list). */
export function SkeletonRow({ className = "" }: { className?: string }) {
  return (
    <div
      className={["flex items-center gap-[var(--space-3)] py-[var(--space-3)]", className].join(" ")}
      aria-hidden="true"
    >
      <SkeletonCircle size="40px" />
      <div className="flex-1 flex flex-col gap-[var(--space-1)]">
        <SkeletonLine width="50%" height="14px" />
        <SkeletonLine width="30%" height="12px" />
      </div>
      <SkeletonLine width="64px" height="28px" className="rounded-[var(--radius-full)]" />
    </div>
  );
}

export default SkeletonGrid;
