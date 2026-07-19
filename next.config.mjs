/**
 * RESORA — Next.js Configuration
 * Per Blueprint §18.1: Next.js App Router (locked, Build Prompt Phase 0
 * Step 1 — "Do not use the Pages Router"), Firebase Storage for
 * seller/product images (remote image domain allow-listed below).
 */

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
        pathname: '/v0/b/**',
      },
      {
        protocol: 'https',
        hostname: 'storage.googleapis.com',
        pathname: '/**',
      },
    ],
  },

  eslint: {
    // Linting runs explicitly in CI (npm run lint) — don't silently skip
    // errors during `next build` by ignoring them here.
    ignoreDuringBuilds: false,
  },

  typescript: {
    // Type errors must fail the build — never ignored (Global Rule #5:
    // no stub/TODO left in code the Acceptance Checklist requires working).
    ignoreBuildErrors: false,
  },

  // Framer Motion + GSAP both rely on browser APIs during animation setup;
  // no special transpile config needed for either at this Next.js version,
  // but kept explicit here as a documented decision point rather than a
  // silent default.
  experimental: {
    optimizePackageImports: ['framer-motion'],
  },
};

export default nextConfig;
