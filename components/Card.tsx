/**
 * components/Card.tsx
 * RSR-CMP-005
 *
 * Base card component only (Blueprint §5.5). Category-aware presentation
 * variants (wide-horizontal, circular-frame, tall-vertical, compact-
 * rounded, gallery-frame) are NOT built here — those land in Phase 4
 * once products exist and consume this base via composition, not
 * duplication.
 */

"use client";

import * as React from "react";
import { motion, type HTMLMotionProps } from "framer-motion";

export interface CardProps extends HTMLMotionProps<"div"> {
  interactive?: boolean; // lifts on hover — use for clickable/navigable cards only
  padding?: "none" | "sm" | "md" | "lg";
  children: React.ReactNode;
}

const paddingClasses: Record<NonNullable<CardProps["padding"]>, string> = {
  none: "p-0",
  sm: "p-[var(--space-3)]",
  md: "p-[var(--space-4)]",
  lg: "p-[var(--space-5)]",
};

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ interactive = false, padding = "md", className = "", children, ...rest }, ref) => {
    return (
      <motion.div
        ref={ref}
        className={[
          "bg-[var(--color-ivory-50)]",
          "rounded-[var(--radius-md)]",
          "shadow-[var(--shadow-card)]",
          "transition-shadow",
          "duration-[var(--duration-base)]",
          "ease-[var(--ease-luxury)]",
          interactive ? "cursor-pointer hover:shadow-[var(--shadow-hover)]" : "",
          paddingClasses[padding],
          className,
        ]
          .filter(Boolean)
          .join(" ")}
        whileHover={interactive ? { y: -4 } : undefined}
        transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
        {...rest}
      >
        {children}
      </motion.div>
    );
  }
);

Card.displayName = "Card";

export default Card;
