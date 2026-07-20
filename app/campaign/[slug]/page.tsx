/**
 * app/campaign/[slug]/page.tsx
 * Campaign landing page
 */

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import ShareButtons from '@/components/shareButtons';
import { EmptyState } from '@/components/EmptyState';

interface PageProps {
  params: { slug: string };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  return {
    title: `Campaign | Resora`,
    description: 'Seasonal campaigns on Resora',
  };
}

export default async function CampaignPage({ params }: PageProps) {
  // TODO: Fetch campaign by slug from service
  const campaign = null;

  if (!campaign) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-[var(--color-black-900)]">
      <section className="px-6 py-16">
        <div className="max-w-6xl mx-auto">
          <h1 className="font-[var(--font-display)] text-[var(--text-h1)] text-[var(--color-ivory-100)]">
            Campaign
          </h1>
          <p className="mt-4 text-[var(--text-body)] text-[var(--color-gray-300)]">
            Seasonal campaigns and collections.
          </p>
        </div>
      </section>
    </main>
  );
}
