/**
 * app/campaign/[slug]/page.tsx
 * Campaign landing page
 * Imports from: services/campaignService.ts, services/productService.ts, types/schema.ts, components/shareButtons.tsx
 */

import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import shareButtons from '@/components/shareButtons';
import ProductCard from '@/product/ProductCard';
import { getCampaignBySlug } from '@/services/campaignService';
import { listProductsByIds, listStudiosByIds } from '@/services/productService';

interface PageProps {
  params: { slug: string };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const campaign = await getCampaignBySlug(params.slug);
  
  if (!campaign) {
    return { title: 'Campaign | Resora' };
  }

  return {
    title: `${campaign.title} | Resora`,
    description: campaign.description,
    openGraph: {
      title: campaign.title,
      description: campaign.description,
      images: campaign.bannerImageUrl ? [{ url: campaign.bannerImageUrl }] : [],
    },
  };
}

export default async function CampaignPage({ params }: PageProps) {
  const campaign = await getCampaignBySlug(params.slug);

  if (!campaign) {
    notFound();
  }

  if (campaign.status !== 'active') {
    return (
      <main className="min-h-screen bg-[var(--color-black-900)] flex items-center justify-center px-6">
        <div className="text-center">
          <h1 className="font-[var(--font-display)] text-[var(--text-h1)] text-[var(--color-ivory-100)] mb-4">
            {campaign.status === 'scheduled' ? 'Coming Soon' : 'Campaign Ended'}
          </h1>
          <p className="text-[var(--text-body)] text-[var(--color-gray-300)]">
            {campaign.status === 'scheduled'
              ? `${campaign.title} launches on ${campaign.startDate}`
              : `${campaign.title} has ended`}
          </p>
        </div>
      </main>
    );
  }

  const [products, studios] = await Promise.all([
    campaign.associatedProductIds.length > 0
      ? listProductsByIds(campaign.associatedProductIds)
      : Promise.resolve([]),
    campaign.associatedStudioIds.length > 0
      ? listStudiosByIds(campaign.associatedStudioIds)
      : Promise.resolve([]),
  ]);

  return (
    <main className="min-h-screen bg-[var(--color-black-900)]">
      {/* Banner */}
      <section
        className="w-full h-80 bg-cover bg-center flex items-end"
        style={{ backgroundImage: `url(${campaign.bannerImageUrl})` }}
      >
        <div className="w-full bg-gradient-to-t from-[var(--color-black-950)]/90 to-transparent p-6">
          <h1 className="font-[var(--font-display)] text-[var(--text-h1)] text-[var(--color-ivory-100)]">
            {campaign.title}
          </h1>
          <p className="text-[var(--text-caption)] text-[var(--color-gray-300)] mt-2">
            {campaign.startDate} – {campaign.endDate}
          </p>
        </div>
      </section>

      {/* Share Section */}
      <section className="px-6 py-8 border-b border-[var(--color-gray-100)]">
        <div className="max-w-6xl mx-auto">
          {shareButtons({ url: `${process.env.NEXT_PUBLIC_SITE_URL || ''}/campaign/${campaign.slug}`, title: campaign.title })}
        </div>
      </section>

      {/* Description */}
      <section className="px-6 py-12">
        <div className="max-w-6xl mx-auto">
          <p className="text-[var(--text-body)] text-[var(--color-gray-300)]">
            {campaign.description}
          </p>
        </div>
      </section>

      {/* Products */}
      {products.length > 0 && (
        <section className="px-6 py-12">
          <div className="max-w-6xl mx-auto">
            <h2 className="font-[var(--font-display)] text-[var(--text-h2)] text-[var(--color-ivory-100)] mb-8">
              Featured Pieces
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Studios */}
      {studios.length > 0 && (
        <section className="px-6 py-12 bg-[var(--color-black-950)]">
          <div className="max-w-6xl mx-auto">
            <h2 className="font-[var(--font-display)] text-[var(--text-h2)] text-[var(--color-ivory-100)] mb-8">
              Featured Studios
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {studios.map((studio) => (
                <div key={studio.id} className="p-6 rounded-[var(--radius-lg)] bg-[var(--color-black-900)] border border-[var(--color-gray-100)]">
                  <h3 className="text-[var(--text-h3)] text-[var(--color-ivory-100)]">
                    {studio.name}
                  </h3>
                  <p className="text-[var(--text-body)] text-[var(--color-gray-300)] mt-2">
                    {studio.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
    </main>
  );
}
