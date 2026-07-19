/**
 * RESORA — Tailwind Theme Configuration
 * Per Build Prompt Phase 0, Step 3: "Implement these as CSS custom
 * properties in a single /styles/tokens.css AND as a matching Tailwind
 * theme extension in tailwind.config — both must stay in sync (generate
 * the Tailwind config from the same source values, don't hand-duplicate
 * numbers in two places)."
 *
 * Every value below maps 1:1 to a custom property in /styles/tokens.css
 * (Blueprint §5.1–§5.4). This file references the CSS variables directly
 * via var(--token-name) rather than restating hex codes/pixel values, so
 * there is exactly one source of truth: change tokens.css and both the
 * raw CSS and every Tailwind utility class pick up the change together.
 *
 * 🔒 Do not add any color, font size, spacing value, or shadow that is
 * not already defined in tokens.css / Blueprint §5 — extend tokens.css
 * first, then reference it here, never the reverse.
 */

import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './modules/**/*.{ts,tsx}',
    './cms/**/*.{ts,tsx}',
    './admin/**/*.{ts,tsx}',
    './seller/**/*.{ts,tsx}',
    './customer/**/*.{ts,tsx}',
    './studio/**/*.{ts,tsx}',
    './product/**/*.{ts,tsx}',
    './collection/**/*.{ts,tsx}',
    './category/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        black: {
          950: 'var(--color-black-950)',
          900: 'var(--color-black-900)',
        },
        charcoal: {
          800: 'var(--color-charcoal-800)',
        },
        ivory: {
          50: 'var(--color-ivory-50)',
          100: 'var(--color-ivory-100)',
        },
        gold: {
          100: 'var(--color-gold-100)',
          500: 'var(--color-gold-500)',
          600: 'var(--color-gold-600)',
        },
        gray: {
          100: 'var(--color-gray-100)',
          300: 'var(--color-gray-300)',
          500: 'var(--color-gray-500)',
          700: 'var(--color-gray-700)',
        },
        success: 'var(--color-success)',
        error: 'var(--color-error)',
        warning: 'var(--color-warning)',
        info: 'var(--color-info)',
      },
      fontFamily: {
        display: ['var(--font-display)'],
        body: ['var(--font-body)'],
      },
      fontSize: {
        hero: ['var(--text-hero)', { lineHeight: 'var(--text-hero-line-height)' }],
        h1: ['var(--text-h1)', { lineHeight: 'var(--text-h1-line-height)' }],
        h2: ['var(--text-h2)', { lineHeight: 'var(--text-h2-line-height)' }],
        h3: ['var(--text-h3)', { lineHeight: 'var(--text-h3-line-height)' }],
        'body-lg': ['var(--text-body-lg)', { lineHeight: 'var(--text-body-lg-line-height)' }],
        body: ['var(--text-body)', { lineHeight: 'var(--text-body-line-height)' }],
        caption: ['var(--text-caption)', { lineHeight: 'var(--text-caption-line-height)' }],
        micro: [
          'var(--text-micro)',
          { lineHeight: 'var(--text-micro-line-height)', letterSpacing: 'var(--text-micro-letter-spacing)' },
        ],
      },
      spacing: {
        1: 'var(--space-1)',
        2: 'var(--space-2)',
        3: 'var(--space-3)',
        4: 'var(--space-4)',
        5: 'var(--space-5)',
        6: 'var(--space-6)',
        7: 'var(--space-7)',
        8: 'var(--space-8)',
        9: 'var(--space-9)',
        10: 'var(--space-10)',
        11: 'var(--space-11)',
      },
      borderRadius: {
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
        xl: 'var(--radius-xl)',
        full: 'var(--radius-full)',
      },
      boxShadow: {
        card: 'var(--shadow-card)',
        hover: 'var(--shadow-hover)',
        modal: 'var(--shadow-modal)',
        'gold-glow': 'var(--shadow-gold-glow)',
      },
      transitionTimingFunction: {
        luxury: 'var(--ease-luxury)',
      },
      transitionDuration: {
        fast: 'var(--duration-fast)',
        base: 'var(--duration-base)',
        slow: 'var(--duration-slow)',
        hero: 'var(--duration-hero)',
      },
      gridTemplateColumns: {
        desktop: 'repeat(var(--grid-columns-desktop), minmax(0, 1fr))',
        tablet: 'repeat(var(--grid-columns-tablet), minmax(0, 1fr))',
        mobile: 'repeat(var(--grid-columns-mobile), minmax(0, 1fr))',
      },
    },
  },
  plugins: [],
};

export default config;
