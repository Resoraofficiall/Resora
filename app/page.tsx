/**
 * app/page.tsx
 * Homepage
 */

import Link from 'next/link';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Resora — Luxury Marketplace',
  description: 'Discover extraordinary handcrafted goods from verified artisan studios',
};

export default function Home() {
  return (
    <main className="min-h-screen bg-[var(--color-black-900)]">
      {/* Hero Section */}
      <section className="px-6 py-24 md:py-32">
        <div className="max-w-6xl mx-auto text-center">
          <h1 className="font-[var(--font-display)] text-[var(--text-h1)] text-[var(--color-ivory-100)] mb-6">
            Welcome to Resora
          </h1>
          <p className="text-[var(--text-body)] text-[var(--color-gray-300)] max-w-2xl mx-auto mb-8">
            A curated marketplace connecting discerning collectors with exceptional sellers of rare and luxury goods.
          </p>
          <div className="flex gap-4 justify-center">
            <Link
              href="/studios"
              className="px-8 py-3 bg-[var(--color-gold-500)] text-[var(--color-black-900)] rounded-[var(--radius-md)] hover:bg-[var(--color-gold-600)] transition"
            >
              Explore Studios
            </Link>
            <Link
              href="/products"
              className="px-8 py-3 border border-[var(--color-gold-500)] text-[var(--color-gold-500)] rounded-[var(--radius-md)] hover:bg-[var(--color-gold-500)] hover:text-[var(--color-black-900)] transition"
            >
              Shop Products
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="px-6 py-16 bg-[var(--color-black-950)]">
        <div className="max-w-6xl mx-auto">
          <h2 className="font-[var(--font-display)] text-[var(--text-h2)] text-[var(--color-ivory-100)] text-center mb-12">
            Why Choose Resora
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                title: 'Curated Selection',
                description: 'Handpicked items from verified artisan studios'
              },
              {
                title: 'Premium Quality',
                description: 'Every piece is inspected for excellence'
              },
              {
                title: 'Secure Shopping',
                description: 'Safe transactions with buyer protection'
              },
            ].map((feature, idx) => (
              <div key={idx} className="p-6 rounded-[var(--radius-lg)] bg-[var(--color-black-900)] border border-[var(--color-gray-100)]">
                <h3 className="text-[var(--text-h3)] text-[var(--color-gold-500)] mb-2">
                  {feature.title}
                </h3>
                <p className="text-[var(--text-body)] text-[var(--color-gray-300)]">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
