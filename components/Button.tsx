/**
 * components/Button.tsx
 * RSR-CMP-004
 *
 * Five variants — Primary (gold-fill), Secondary (ivory-fill), Outline,
 * Ghost, Danger — each with hover / focus / pressed / loading / disabled
 * states defined once here and never re-implemented per-page
 * (Blueprint §5.5). Every value used is a design-token reference from
 * styles/tokens.css — no raw hex/px/ms values.
 */

"use client";

import * as React from "react";
import { motion, type HTMLMotionProps } from "framer-motion";

export type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends Omit<HTMLMotionProps<"button">, "children"> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
  children: React.ReactNode;
}

const baseClasses = [
  "inline-flex items-center justify-center gap-[var(--space-2)]",
  "font-[var(--font-body)] font-medium",
  "rounded-[var(--radius-sm)]",
  "transition-colors",
  "duration-[var(--duration-base)]",
  "ease-[var(--ease-luxury)]",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
  "focus-visible:ring-[var(--color-gold-500)] focus-visible:ring-offset-[var(--color-black-900)]",
  "disabled:cursor-not-allowed disabled:opacity-50",
].join(" ");

const sizeClasses: Record<ButtonSize, string> = {
  sm: "h-9 px-[var(--space-3)] text-[var(--text-caption)]",
  md: "h-11 px-[var(--space-4)] text-[var(--text-body)]",
  lg: "h-13 px-[var(--space-5)] text-[var(--text-body-lg)]",
};

const variantClasses: Record<ButtonVariant, string> = {
  primary: [
    "bg-[var(--color-gold-500)] text-[var(--color-black-900)]",
    "hover:bg-[var(--color-gold-600)] hover:shadow-[var(--shadow-gold-glow)]",
    "active:bg-[var(--color-gold-600)]",
  ].join(" "),
  secondary: [
    "bg-[var(--color-ivory-100)] text-[var(--color-black-900)]",
    "hover:bg-[var(--color-ivory-50)] hover:shadow-[var(--shadow-hover)]",
    "active:bg-[var(--color-gray-100)]",
  ].join(" "),
  outline: [
    "bg-transparent text-[var(--color-ivory-100)]",
    "border border-[var(--color-gray-500)]",
    "hover:border-[var(--color-gold-500)] hover:text-[var(--color-gold-500)]",
    "active:border-[var(--color-gold-600)] active:text-[var(--color-gold-600)]",
  ].join(" "),
  ghost: [
    "bg-transparent text-[var(--color-ivory-100)]",
    "hover:bg-[var(--color-charcoal-800)]",
    "active:bg-[var(--color-black-950)]",
  ].join(" "),
  danger: [
    "bg-[var(--color-error)] text-[var(--color-ivory-50)]",
    "hover:brightness-110",
    "active:brightness-95",
  ].join(" "),
};

function Spinner({ variant }: { variant: ButtonVariant }) {
  const strokeColor =
    variant === "primary" ? "var(--color-black-900)" : variant === "secondary" ? "var(--color-black-900)" : "currentColor";
  return (
    <svg
      className="h-4 w-4 animate-spin"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      style={{ color: strokeColor }}
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
      <path
        className="opacity-90"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      isLoading = false,
      leftIcon,
      rightIcon,
      fullWidth = false,
      disabled,
      children,
      className = "",
      whileTap,
      ...rest
    },
    ref
  ) => {
    const isDisabled = disabled || isLoading;

    return (
      <motion.button
        ref={ref}
        type={rest.type ?? "button"}
        disabled={isDisabled}
        aria-busy={isLoading}
        aria-disabled={isDisabled}
        whileTap={isDisabled ? undefined : whileTap ?? { scale: 0.97 }}
        transition={{ duration: 0.15, ease: [0.4, 0, 0.2, 1] }}
        className={[
          baseClasses,
          sizeClasses[size],
          variantClasses[variant],
          fullWidth ? "w-full" : "",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
        {...rest}
      >
        {isLoading ? (
          <Spinner variant={variant} />
        ) : (
          leftIcon && <span className="inline-flex shrink-0 items-center">{leftIcon}</span>
        )}
        <span>{children}</span>
        {!isLoading && rightIcon && <span className="inline-flex shrink-0 items-center">{rightIcon}</span>}
      </motion.button>
    );
  }
);

Button.displayName = "Button";

export default Button;
