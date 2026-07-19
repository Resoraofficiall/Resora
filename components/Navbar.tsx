/**
 * components/Navbar.tsx
 * RSR-CMP-001
 *
 * Desktop nav: transparent-over-hero → solid-on-scroll transition
 * (Blueprint §5). Primary items per §4.6 (max 8) are wired here as
 * placeholder links only — real routes land as each page ships in
 * later phases. Route paths already match the §4.2/§4.5/§4.6 naming
 * convention so no relinking is needed later.
 */

"use client";

import * as React from "react";
import Link from "next/link";

const PRIMARY_NAV_ITEMS = [
  { label: "Home", href: "/" },
  { label: "Studios", href: "/studios" },
  { label: "Collections", href: "/collection" },
  { label: "Journal", href: "/journal" },
  { label: "Custom Orders", href: "/custom-orders" },
  { label: "About", href: "/about" },
  { label: "Support", href: "/support" },
] as const;

const ICON_ITEMS = [
  { label: "Search", href: "/search" },
  { label: "Wishlist", href: "/account/wishlist" },
  { label: "Cart", href: "/cart" },
  { label: "Profile", href: "/account/overview" },
] as const;

function SearchIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.5" />
      <path d="M21 21l-4.3-4.3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
function HeartIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 20s-7-4.35-9.5-8.5C.8 8 2.5 4.5 6 4.5c2 0 3.5 1.2 4.2 2.6C10.9 5.7 12.4 4.5 14.4 4.5c3.5 0 5.2 3.5 3.5 7C15.4 15.65 12 20 12 20z"
        stroke="currentColor"
        strokeWidth="1.5"
      />
    </svg>
  );
}
function BagIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M6 8h12l-1 12H7L6 8z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M9 8V6a3 3 0 016 0v2" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}
function UserIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M4.5 20c1.5-3.5 4.5-5.5 7.5-5.5s6 2 7.5 5.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

const ICON_MAP: Record<(typeof ICON_ITEMS)[number]["label"], React.ReactNode> = {
  Search: <SearchIcon />,
  Wishlist: <HeartIcon />,
  Cart: <BagIcon />,
  Profile: <UserIcon />,
};

export interface NavbarProps {
  onMobileMenuOpen?: () => void;
  transparentOverHero?: boolean; // false on pages with no hero (forces solid immediately)
}

export function Navbar({ onMobileMenuOpen, transparentOverHero = true }: NavbarProps) {
  const [isScrolled, setIsScrolled] = React.useState(!transparentOverHero);

  React.useEffect(() => {
    if (!transparentOverHero) return;

    const SCROLL_THRESHOLD = 64;
    const handleScroll = () => {
      setIsScrolled(window.scrollY > SCROLL_THRESHOLD);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [transparentOverHero]);

  const solid = isScrolled || !transparentOverHero;

  return (
    <header
      className={[
        "fixed top-0 left-0 right-0 z-50",
        "transition-colors duration-[var(--duration-base)] ease-[var(--ease-luxury)]",
        solid
          ? "bg-[var(--color-black-900)] shadow-[var(--shadow-card)]"
          : "bg-transparent",
      ].join(" ")}
    >
      <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between px-[var(--space-4)] md:px-[var(--space-5)]">
        <Link
          href="/"
          className="font-[var(--font-display)] text-[var(--text-h3)] text-[var(--color-ivory-100)] tracking-wide"
        >
          Resora
        </Link>

        <nav aria-label="Primary" className="hidden lg:flex items-center gap-[var(--space-4)]">
          {PRIMARY_NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={[
                "text-[var(--text-body)] text-[var(--color-ivory-100)]",
                "transition-colors duration-[var(--duration-fast)] ease-[var(--ease-luxury)]",
                "hover:text-[var(--color-gold-500)]",
              ].join(" ")}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-[var(--space-3)]">
          <div className="hidden md:flex items-center gap-[var(--space-3)]">
            {ICON_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-label={item.label}
                className={[
                  "text-[var(--color-ivory-100)]",
                  "transition-colors duration-[var(--duration-fast)] ease-[var(--ease-luxury)]",
                  "hover:text-[var(--color-gold-500)]",
                ].join(" ")}
              >
                {ICON_MAP[item.label]}
              </Link>
            ))}
          </div>

          <button
            type="button"
            aria-label="Open menu"
            onClick={onMobileMenuOpen}
            className="lg:hidden text-[var(--color-ivory-100)] p-[var(--space-2)]"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </div>
    </header>
  );
}

export default Navbar;
