import type { Metadata } from "next";
import { Cormorant_Garamond, Inter } from "next/font/google";
import "./globals.css";

const display = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-display",
  display: "swap",
});

const body = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://resora-demo.vercel.app"),
  title: "Resora — The Marketplace for the Extraordinary",
  description:
    "Resora is a curated marketplace connecting discerning collectors with the world's most exceptional sellers of rare, luxury, and one-of-a-kind objects.",
  keywords: [
    "Resora",
    "luxury marketplace",
    "curated goods",
    "rare collectibles",
    "premium sellers",
  ],
  openGraph: {
    title: "Resora — The Marketplace for the Extraordinary",
    description:
      "A curated marketplace for the world's most exceptional sellers and collectors.",
    type: "website",
    siteName: "Resora",
  },
  twitter: {
    card: "summary_large_image",
    title: "Resora — The Marketplace for the Extraordinary",
    description:
      "A curated marketplace for the world's most exceptional sellers and collectors.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body className="font-body bg-obsidian text-ivory antialiased bg-noise">
        {children}
      </body>
    </html>
  );
}
