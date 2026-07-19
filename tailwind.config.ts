/**
 * tailwind.config.ts
 * RSR-STY (companion to styles/tokens.css, RSR-STY-001)
 *
 * Theme extension generated from the exact same values defined in
 * styles/tokens.css — numbers are never hand-duplicated between the two
 * files (Phase 0, Step 3). Component code should prefer the
 * `var(--token-name)` arbitrary-value form already in use across
 * components/*.tsx, but these theme keys exist so `bg-gold-500`,
 * `text-h1`, etc. also resolve correctly for any code that uses the
 * semantic utility form instead of an arbitrary CSS-var reference.
 */

import type { Config } from "tailwindcss";

// Single source of numeric truth — keep in lockstep with styles/tokens.css.
const colors = {
  black: {
    950: "#0B0B0B",
    900: "#111111",
  },
  charcoal: {
    800: "#1C1B19",
  },
  ivory: {
    100: "#F7F4EF",
    50: "#FBFAF7",
  },
  gold: {
    500: "#C8A96A",
    600: "#B08D4F",
    100: "#EFE3CB",
  },
  gray: {
    700: "#4A4744",
    500: "#8A857E",
    300: "#D4CFC7",
    100: "#EDEAE4",
  },
  success: "#3E6B52",
  error: "#8C3B34",
  warning: "#A67C2E",
  info: "#3C5A6E",
};

const spacing = {
  1: "4px",
  2: "8px",
  3: "16px",
  4: "24px",
  5: "32px",
  6: "40px",
  7: "48px",
  8: "64px",
  9: "80px",
  10: "96px",
  11: "128px",
};

const borderRadius = {
  sm: "8px",
  md: "16px",
  lg: "24px",
  xl: "28px",
  full: "999px",
};

const boxShadow = {
  card: "0 2px 12px rgba(17,17,17,0.06)",
  hover: "0 8px 24px rgba(17,17,17,0.10)",
  modal: "0 16px 48px rgba(17,17,17,0.18)",
  "gold-glow": "0 0 24px rgba(200,169,106,0.25)",
};

const transitionTimingFunction = {
  luxury: "cubic-bezier(0.4, 0.0, 0.2, 1)",
};

const transitionDuration = {
  fast: "150ms",
  base: "250ms",
  slow: "400ms",
  hero: "600ms",
};

const fontFamily = {
  display: ["var(--font-display-family)", "Cormorant Garamond", "serif"],
  body: ["var(--font-body-family)", "Inter", "-apple-system", "sans-serif"],
};

const fontSize = {
  hero: ["clamp(2.5rem, 5vw, 4.5rem)", { lineHeight: "1.1" }],
  h1: ["clamp(2rem, 3.5vw, 3rem)", { lineHeight: "1.15" }],
  h2: ["1.75rem", { lineHeight: "1.25" }],
  h3: ["1.375rem", { lineHeight: "1.3" }],
  "body-lg": ["1.125rem", { lineHeight: "1.6" }],
  body: ["1rem", { lineHeight: "1.6" }],
  caption: ["0.875rem", { lineHeight: "1.5" }],
  micro: ["0.75rem", { lineHeight: "1.4", letterSpacing: "0.02em" }],
};

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./modules/**/*.{ts,tsx}",
    "./studio/**/*.{ts,tsx}",
    "./product/**/*.{ts,tsx}",
    "./collection/**/*.{ts,tsx}",
    "./category/**/*.{ts,tsx}",
    "./cms/**/*.{ts,tsx}",
    "./admin/**/*.{ts,tsx}",
    "./seller/**/*.{ts,tsx}",
    "./customer/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors,
      spacing,
      borderRadius,
      boxShadow,
      transitionTimingFunction,
      transitionDuration,
      fontFamily,
      fontSize,
      keyframes: {
        "skeleton-shimmer": {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(100%)" },
        },
      },
      animation: {
        "skeleton-shimmer": "skeleton-shimmer 1.6s cubic-bezier(0.4, 0.0, 0.2, 1) infinite",
      },
      screens: {
        // Grid breakpoints backing the 12/8/4-column system (Blueprint §5.4).
        sm: "480px",
        md: "768px",
        lg: "1024px",
        xl: "1280px",
        "2xl": "1440px",
      },
    },
  },
  plugins: [],
};

export default config;
