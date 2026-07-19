/**
 * components/MobileNav.tsx
 * RSR-CMP-002
 *
 * Slide-in panel companion to Navbar.tsx (Blueprint §5, §4.6). Reuses
 * the same primary nav item list and route paths — do not fork a second
 * copy of the nav data; import from a shared constant if a third
 * consumer appears.
 */

"use client";

import * as React from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";

const PRIMARY_NAV_ITEMS = [
  { label: "Home", href: "/" },
  { label: "Studios", href: "/studios" },
  { label: "Collections", href: "/collection" },
  { label: "Journal", href: "/journal" },
  { label: "Custom Orders", href: "/custom-orders" },
  { label: "About", href: "/about" },
  { label: "Support", href: "/support" },
] as const;

const ICON_NAV_ITEMS = [
  { label: "Search", href: "/search" },
  { label: "Wishlist", href: "/account/wishlist" },
  { label: "Cart", href: "/cart" },
  { label: "Profile", href: "/account/overview" },
] as const;

export interface MobileNavProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MobileNav({ isOpen, onClose }: MobileNavProps) {
  React.useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  React.useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            key="mobile-nav-backdrop"
            className="fixed inset-0 z-[60] bg-[var(--color-black-950)]/60 lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
            onClick={onClose}
            aria-hidden="true"
          />

          <motion.aside
            key="mobile-nav-panel"
            role="dialog"
            aria-modal="true"
            aria-label="Mobile navigation"
            className={[
              "fixed top-0 right-0 z-[70] h-full w-[85vw] max-w-[360px] lg:hidden",
              "bg-[var(--color-black-900)] shadow-[var(--shadow-modal)]",
              "flex flex-col",
            ].join(" ")}
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
          >
            <div className="flex items-center justify-between px-[var(--space-4)] h-16">
              <span className="font-[var(--font-display)] text-[var(--text-h3)] text-[var(--color-ivory-100)]">
                Resora
              </span>
              <button
                type="button"
                aria-label="Close menu"
                onClick={onClose}
                className="text-[var(--color-ivory-100)] p-[var(--space-2)]"
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            <nav aria-label="Primary" className="flex flex-col px-[var(--space-4)] py-[var(--space-3)] gap-[var(--space-1)]">
              {PRIMARY_NAV_ITEMS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className={[
                    "py-[var(--space-2)] text-[var(--text-body-lg)] text-[var(--color-ivory-100)]",
                    "border-b border-[var(--color-charcoal-800)]",
                    "transition-colors duration-[var(--duration-fast)] ease-[var(--ease-luxury)]",
                    "hover:text-[var(--color-gold-500)]",
                  ].join(" ")}
                >
                  {item.label}
                </Link>
              ))}
            </nav>

            <div className="mt-auto flex justify-around px-[var(--space-4)] py-[var(--space-4)] border-t border-[var(--color-charcoal-800)]">
              {ICON_NAV_ITEMS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  aria-label={item.label}
                  className="text-[var(--text-caption)] text-[var(--color-ivory-100)] hover:text-[var(--color-gold-500)]"
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

export default MobileNav;
