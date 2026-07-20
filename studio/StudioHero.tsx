/**
 * studio/StudioHero.tsx
 * Studio header component
 * Imports from: components/shareButtons.tsx, types/schema.ts
 */

'use client';

import shareButtons from '@/components/shareButtons';
import type { Studio } from '@/types/schema';

export interface StudioHeroProps {
  studio: Studio;
}

export function StudioHero({ studio }: StudioHeroProps) {
  const url = typeof window !== 'undefined' ? window.location.href : '';

  return (
    <div
      className="relative w-full aspect-[21/9] bg-[var(--color-gray-100)] bg-cover bg-center flex items-end rounded-[var(--radius-lg)] overflow-hidden"
      style={studio.bannerUrl ? { backgroundImage: `url(${studio.bannerUrl})` } : undefined}
    >
      <div className="w-full bg-gradient-to-t from-[var(--color-black-950)]/90 via-[var(--color-black-950)]/50 to-transparent p-6">
        <div className="flex items-end justify-between gap-4">
          <div className="flex-1">
            <h1 className="font-[var(--font-display)] text-[var(--text-h1)] text-[var(--color-ivory-100)]">
              {studio.name}
            </h1>
            <p className="mt-2 text-[var(--text-body)] text-[var(--color-gray-300)] max-w-2xl">
              {studio.description}
            </p>
          </div>
          {studio.logoUrl && (
            <img
              src={studio.logoUrl}
              alt={studio.name}
              className="w-16 h-16 rounded-full object-cover border-2 border-[var(--color-gold-500)]"
            />
          )}
        </div>
        <div className="mt-4">
          {shareButtons({ url, title: studio.name })}
        </div>
      </div>
    </div>
  );
}
