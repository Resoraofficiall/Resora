/**
 * studio/StudioHero.tsx
 * Studio header component
 */

import ShareButtons from '@/components/shareButtons';
import type { Studio } from '@/types/schema';

export interface StudioHeroProps {
  studio: Studio;
}

export function StudioHero({ studio }: StudioHeroProps) {
  const url = typeof window !== 'undefined' ? window.location.href : '';

  return (
    <div
      className="relative w-full aspect-[21/9] bg-[var(--color-gray-100)] bg-cover bg-center flex items-end"
      style={studio.bannerUrl ? { backgroundImage: `url(${studio.bannerUrl})` } : undefined}
    >
      <div className="w-full bg-gradient-to-t from-[var(--color-black-950)]/80 to-transparent p-[var(--space-5)]">
        <h1 className="font-[var(--font-display)] text-[var(--text-h1)] text-[var(--color-ivory-100)]">
          {studio.name}
        </h1>
        <p className="mt-[var(--space-1)] text-[var(--text-body)] text-[var(--color-gray-300)]">
          {studio.description}
        </p>
        <div className="mt-[var(--space-3)]">
          <ShareButtons url={url} title={studio.name} />
        </div>
      </div>
    </div>
  );
}

export default StudioHero;
