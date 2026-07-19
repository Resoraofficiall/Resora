import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getCampaignBySlug } from '@/services/campaignService';
import { listProductsByIds } from '@/services/productService';
import { listStudiosByIds } from '@/services/studioService';
import { ProductCard } from '@/product/ProductCard';
import { StudioHero } from '@/studio/StudioHero';
import { ShareButtons } from '@/components/ShareButtons';
import { EmptyState } from '@/components/EmptyState';

// ---------------------------------------------------------------------------
// RSR-APP-054 — app/campaign/[slug]/page.tsx
// Public Seasonal Campaign landing page (Blueprint §4.2 row 32). Only
// rendered when the campaign's landingPageEnabled flag is true AND its
// status is "active" — activation/deactivation is driven entirely by the
// scheduled Cloud Function toggling status (Phase 12 Step 3), this page
// never re-implements the date-window logic itself, it only reads status.
// Server component: no client-side data fetching, no Firestore access from
// the browser.
// ---------------------------------------------------------------------------

interface PageProps {
  params: { slug: string };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const campaign = await getCampaignBySlug(params.slug);
  if (!campaign || !campaign.landingPageEnabled) {
    return { title: 'Resora' };
  }
  return {
    title: `${campaign.title} — Resora`,
    description: `Discover ${campaign.title} on Resora, India's curated resin art marketplace.`,
    openGraph: {
      title: campaign.title,
      images: campaign.bannerImageUrl ? [{ url: campaign.bannerImageUrl }] : undefined,
      type: 'website',
    },
  };
}

export default async function CampaignLandingPage({ params }: PageProps) {
  const campaign = await getCampaignBySlug(params.slug);

  if (!campaign || !campaign.landingPageEnabled) {
    notFound();
  }

  if (campaign.status !== 'active') {
    return (
      <div className="mx-auto max-w-2xl px-6 py-24 text-center">
        <EmptyState
          title="This campaign isn't live right now"
          message={
            campaign.status === 'scheduled'
              ? `${campaign.title} begins ${campaign.startDate}. Check back then.`
              : `${campaign.title} has ended.`
          }
        />
      </div>
    );
  }

  const [products, studios] = await Promise.all([
    campaign.associatedProductIds.length ? listProductsByIds(campaign.associatedProductIds) : Promise.resolve([]),
    campaign.associatedStudioIds.length ? listStudiosByIds(campaign.associatedStudioIds) : Promise.resolve([]),
  ]);

  return (
    <main className="bg-[var(--color-ivory-100)]">
      <section
        className="flex h-[60vh] min-h-[360px] w-full items-end bg-cover bg-center px-6 pb-10 md:px-16"
        style={{ backgroundImage: `url(${campaign.bannerImageUrl})` }}
      >
        <div className="max-w-2xl">
          <h1 className="font-[var(--font-display)] text-[length:var(--text-hero)] text-[var(--color-ivory-50)]">
            {campaign.title}
          </h1>
          <p className="mt-2 text-[length:var(--text-caption)] text-[var(--color-ivory-100)]">
            {campaign.startDate} – {campaign.endDate}
          </p>
        </div>
      </section>

      <section className="px-6 py-6 md:px-16">
        <ShareButtons
          title={campaign.title}
          url={`https://resora.in/campaign/${campaign.slug}`}
          imageUrl={campaign.bannerImageUrl}
        />
      </section>

      {studios.length > 0 && (
        <section className="px-6 py-8 md:px-16">
          <h2 className="mb-6 text-[length:var(--text-h2)] text-[var(--color-black-900)]">Featured Studios</h2>
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
            {studios.map((studio) => (
              <StudioHero key={studio.id} studio={studio} compact />
            ))}
          </div>
        </section>
      )}

      <section className="px-6 py-8 md:px-16">
        <h2 className="mb-6 text-[length:var(--text-h2)] text-[var(--color-black-900)]">Featured Pieces</h2>
        {products.length === 0 ? (
          <EmptyState title="No pieces added yet" message="Check back soon for the featured collection." />
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
