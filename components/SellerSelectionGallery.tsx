'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { EmptyState } from './EmptyState';
import { LoadingSkeleton } from './LoadingSkeleton';
import { ErrorState } from './ErrorState';
import { listActiveApprovedStudios, type StudioSummary } from '@/services/studioService';

// ---------------------------------------------------------------------------
// RSR-CMP-013 — components/SellerSelectionGallery.tsx
// Blueprint §30.7. 🔒 LOCKED: renders only real, founder-approved, active
// studios pulled live from Firestore via studioService — this file contains
// no hardcoded/example/seed studio names anywhere. Zero-result state uses
// the shared EmptyState component, never a fake card.
// ---------------------------------------------------------------------------

interface SellerSelectionGalleryProps {
  onClose: () => void;
}

function TiltCard({ studio, onOpen }: { studio: StudioSummary; onOpen: () => void }) {
  const cardRef = useRef<HTMLButtonElement>(null);
  const [tilt, setTilt] = useState({ rx: 0, ry: 0 });

  const handleMove = (e: React.PointerEvent) => {
    const el = cardRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    setTilt({ rx: py * -10, ry: px * 10 });
  };

  return (
    <motion.button
      ref={cardRef}
      onPointerMove={handleMove}
      onPointerLeave={() => setTilt({ rx: 0, ry: 0 })}
      onClick={onOpen}
      initial={{ opacity: 0, y: 24 }}
      animate={{
        opacity: 1,
        y: [0, -6, 0],
        rotateX: tilt.rx,
        rotateY: tilt.ry,
      }}
      transition={{
        opacity: { duration: 0.4, ease: [0.4, 0, 0.2, 1] },
        y: { duration: 3.4, repeat: Infinity, ease: 'easeInOut' },
        rotateX: { duration: 0.2 },
        rotateY: { duration: 0.2 },
      }}
      style={{ transformStyle: 'preserve-3d', perspective: 800 }}
      className="group relative w-56 shrink-0 overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-gold-500)]/30 bg-white/5 text-left shadow-[var(--shadow-hover)] backdrop-blur-md"
    >
      <div
        className="h-64 w-full bg-cover bg-center"
        style={{ backgroundImage: studio.heroImageUrl ? `url(${studio.heroImageUrl})` : undefined }}
      />
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[var(--color-black-900)]/90 to-transparent p-4">
        <p className="font-[var(--font-display)] text-[length:var(--text-h3)] text-[var(--color-ivory-50)]">
          {studio.name}
        </p>
        {studio.storyFragment && (
          <p className="mt-1 text-[length:var(--text-caption)] text-[var(--color-ivory-100)]/80">
            {studio.storyFragment}
          </p>
        )}
      </div>
    </motion.button>
  );
}

export function SellerSelectionGallery({ onClose }: SellerSelectionGalleryProps) {
  const router = useRouter();
  const [studios, setStudios] = useState<StudioSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await listActiveApprovedStudios();
        if (!cancelled) setStudios(data);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load Studios.');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
        className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[var(--color-black-950)]/92 px-6 backdrop-blur-xl"
        onClick={onClose}
      >
        <button
          aria-label="Close"
          onClick={onClose}
          className="absolute right-6 top-6 text-[length:var(--text-h3)] text-[var(--color-ivory-50)]"
        >
          ×
        </button>

        <div onClick={(e) => e.stopPropagation()} className="w-full max-w-5xl">
          {error ? (
            <ErrorState title="Something went wrong" message={error} />
          ) : studios === null ? (
            <LoadingSkeleton rows={3} />
          ) : studios.length === 0 ? (
            <EmptyState
              title="No Studios have been welcomed yet"
              message="Resora's founding artisans are being curated. Please return soon."
            />
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
              className="flex gap-8 overflow-x-auto px-4 py-10"
            >
              {studios.map((studio) => (
                <TiltCard key={studio.id} studio={studio} onOpen={() => router.push(`/studio/${studio.slug}`)} />
              ))}
            </motion.div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
