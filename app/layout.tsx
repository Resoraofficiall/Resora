/**
 * app/layout.tsx
 * RSR-APP-001
 *
 * Root layout for the Next.js App Router. Loads the two locked
 * typefaces (Blueprint §5.2), applies the design token stylesheet,
 * and sets base metadata. Product-specific UI (nav wiring, opening
 * cinematic, providers) is intentionally NOT assembled here yet —
 * those land once Phase 0's core components exist and Phase 1 wires
 * real auth state. This phase only builds the shell.
 */

import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Inter } from "next/font/google";
import "../styles/tokens.css";
import "./globals.css";

const fontDisplay = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-display-family",
  display: "swap",
});

const fontBody = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-body-family",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Resora — Extraordinary Craftsmanship",
    template: "%s | Resora",
  },
  description:
    "Resora is a luxury multi-vendor marketplace for handcrafted resin art, connecting discerning collectors with verified artisan studios.",
  metadataBase: process.env.NEXT_PUBLIC_SITE_URL ? new URL(process.env.NEXT_PUBLIC_SITE_URL) : undefined,
  icons: {
    icon: "/favicon.ico",
  },
};

export const viewport: Viewport = {
  themeColor: "#111111",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${fontDisplay.variable} ${fontBody.variable}`}>
      <body className="bg-[var(--color-black-900)] text-[var(--color-ivory-100)] font-[var(--font-body)] antialiased">
        {children}
      </body>
    </html>
  );
}
