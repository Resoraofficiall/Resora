/**
 * RESORA — Homepage
 * Per Blueprint §9.2 (Homepage Discovery Order, locked) and §6.2
 * (cms/homepage as an ordered, typed block tree). This page renders
 * whatever blocks the Founder has configured, in the locked order below,
 * never hardcoding section copy (Global Rule #2).
 *
 * Block components for Featured Studios / Collections / Best Sellers /
 * New Arrivals depend on the product & studio data layer (Phase 4/5,
 * not yet built) — until then, each renders its Blueprint §5.7 empty
 * state rather than fake/placeholder data, so the homepage is truthful
 * about what actually exists today instead of simulating a populated
 * marketplace.
 */

import { getCmsDocument, getOrderedEnabledBlocks } from '@/services/cmsService';
import { EmptyState } from '@/components/EmptyState';
import type { CmsBlock } from '@/types/schema';

// Locked order per §9.2 — used as the fallback rendering order when no
// cms/homepage document exists yet (first-launch state), and as the
// canonical block-type list the Homepage Builder (Phase 10) will manage.
const LOCKED_HOMEPAGE_BLOCK_TYPES = [
  'hero',
  'featuredStudios',
  'featuredCollections',
  'signatureCategories',
  'bestSellers',
  'newArrivals',
  'customOrderBanner',
  'whyResora',
  'artistStories',
  'testimonials',
  'journal',
  'newsletter',
] as const;

function HeroBlock({ block }: { block: CmsBlock }) {
  const headline = (block.data.headline as string) || 'Discover Extraordinary Craftsmanship.';
  const subhead = (block.data.subhead as string) || '';

  return (
    <section className="relative flex min-h-[70vh] flex-col items-center justify-center bg-black-900 px-4 text-center">
      <h1 className="font-display text-hero text-ivory-100">{headline}</h1>
      {subhead && (
        <p className="mt-4 max-w-xl font-body text-body-lg text-gray-300">{subhead}</p>
      )}
    </section>
  );
}

function FeaturedStudiosBlock() {
  // No hardcoded seller names per §30.7's "no placeholder data" rule,
  // extended here to every discovery surface, not just the Discovery
  // Pad's gallery — a real query lands once studioService exists.
  return (
    <section className="px-4 py-11">
      <h2 className="mb-6 font-display text-h2 text-charcoal-800">Featured Studios</h2>
      <EmptyState
        title="Studios are being curated."
        message="Resora is currently reviewing applications from independent artists. Check back soon to discover verified Studios."
      />
    </section>
  );
}

function FeaturedCollectionsBlock() {
  return (
    <section className="px-4 py-11">
      <h2 className="mb-6 font-display text-h2 text-charcoal-800">Featured Collections</h2>
      <EmptyState
        title="Collections are on their way."
        message="Curated collections will appear here once Studios begin publishing their work."
      />
    </section>
  );
}

function SignatureCategoriesBlock() {
  return (
    <section className="px-4 py-11">
      <h2 className="mb-6 font-display text-h2 text-charcoal-800">Signature Categories</h2>
      <EmptyState
        title="Categories coming soon."
        message="Browse by category once the catalog is live."
      />
    </section>
  );
}

function BestSellersBlock() {
  return (
    <section className="px-4 py-11">
      <h2 className="mb-6 font-display text-h2 text-charcoal-800">Best Sellers</h2>
      <EmptyState
        title="No best sellers yet."
        message="This space will highlight the most-loved pieces on Resora."
      />
    </section>
  );
}

function NewArrivalsBlock() {
  return (
    <section className="px-4 py-11">
      <h2 className="mb-6 font-display text-h2 text-charcoal-800">New Arrivals</h2>
      <EmptyState
        title="Nothing new just yet."
        message="Recently published pieces from Resora Studios will appear here."
      />
    </section>
  );
}

function CustomOrderBannerBlock({ block }: { block: CmsBlock }) {
  const message =
    (block.data.message as string) ||
    'Have something in mind? Commission a piece made exactly for you.';

  return (
    <section className="bg-charcoal-800 px-4 py-9 text-center">
      <p className="font-display text-h3 text-ivory-100">{message}</p>
    </section>
  );
}

function WhyResoraBlock({ block }: { block: CmsBlock }) {
  const body =
    (block.data.body as string) ||
    'Every Studio on Resora is reviewed for craftsmanship, photography, and brand fit before it ever reaches a collector.';

  return (
    <section className="px-4 py-11 text-center">
      <h2 className="mb-4 font-display text-h2 text-charcoal-800">Why Resora</h2>
      <p className="mx-auto max-w-2xl font-body text-body-lg text-gray-700">{body}</p>
    </section>
  );
}

function ArtistStoriesBlock() {
  return (
    <section className="px-4 py-11">
      <h2 className="mb-6 font-display text-h2 text-charcoal-800">Artist Stories</h2>
      <EmptyState
        title="Stories are being written."
        message="Studio journeys and craft stories will be featured here."
      />
    </section>
  );
}

function TestimonialsBlock() {
  return (
    <section className="px-4 py-11">
      <h2 className="mb-6 font-display text-h2 text-charcoal-800">Testimonials</h2>
      <EmptyState
        title="No testimonials yet."
        message="Collector reviews will appear here as orders complete."
      />
    </section>
  );
}

function JournalBlock() {
  return (
    <section className="px-4 py-11">
      <h2 className="mb-6 font-display text-h2 text-charcoal-800">Journal</h2>
      <EmptyState
        title="The Journal hasn't started yet."
        message="Editorial stories about craftsmanship and Studios will be published here."
      />
    </section>
  );
}

function NewsletterBlock({ block }: { block: CmsBlock }) {
  const heading = (block.data.heading as string) || 'Stay close to the craft.';

  return (
    <section className="border-t border-gray-100 px-4 py-11 text-center">
      <h2 className="mb-4 font-display text-h2 text-charcoal-800">{heading}</h2>
      <form className="mx-auto flex max-w-md gap-2" aria-label="Newsletter signup">
        <input
          type="email"
          placeholder="Your email"
          className="flex-1 rounded-sm border border-gray-300 px-3 py-2 font-body text-body"
          required
        />
        <button
          type="submit"
          className="rounded-sm bg-gold-500 px-5 py-2 font-body text-body text-black-900 transition-colors duration-base ease-luxury hover:bg-gold-600"
        >
          Subscribe
        </button>
      </form>
    </section>
  );
}

const BLOCK_RENDERERS: Record<string, (block: CmsBlock) => React.ReactNode> = {
  hero: (block) => <HeroBlock block={block} />,
  featuredStudios: () => <FeaturedStudiosBlock />,
  featuredCollections: () => <FeaturedCollectionsBlock />,
  signatureCategories: () => <SignatureCategoriesBlock />,
  bestSellers: () => <BestSellersBlock />,
  newArrivals: () => <NewArrivalsBlock />,
  customOrderBanner: (block) => <CustomOrderBannerBlock block={block} />,
  whyResora: (block) => <WhyResoraBlock block={block} />,
  artistStories: () => <ArtistStoriesBlock />,
  testimonials: () => <TestimonialsBlock />,
  journal: () => <JournalBlock />,
  newsletter: (block) => <NewsletterBlock block={block} />,
};

export default async function HomePage() {
  const cmsDoc = await getCmsDocument('homepage');
  const enabledBlocks = getOrderedEnabledBlocks(cmsDoc);

  // First-launch state: no cms/homepage document has been created yet.
  // Render every block in the locked §9.2 order with its own default
  // copy/empty-state rather than a blank page or a crash — a Founder
  // hasn't configured anything yet, but the site must never 404 or
  // show nothing (§5.7 applies to the page level too, not just lists).
  const blocksToRender: CmsBlock[] =
    enabledBlocks.length > 0
      ? enabledBlocks
      : LOCKED_HOMEPAGE_BLOCK_TYPES.map((type, index) => ({
          type,
          order: index,
          enabled: true,
          data: {},
        }));

  return (
    <main>
      {blocksToRender.map((block, index) => {
        const renderer = BLOCK_RENDERERS[block.type];
        if (!renderer) return null;
        return <div key={`${block.type}-${index}`}>{renderer(block)}</div>;
      })}
    </main>
  );
}
