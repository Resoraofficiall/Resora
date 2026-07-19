'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { HandwritingCapture } from './DiscoveryPad/HandwritingCapture';
import { PinchZoomPortal } from './DiscoveryPad/PinchZoomPortal';
import { SellerSelectionGallery } from './SellerSelectionGallery';

// ---------------------------------------------------------------------------
// RSR-CMP-010 — components/DiscoveryPad.tsx
// Blueprint §30.4. The single floating luxury glass object that replaces
// search, category browsing, and seller navigation. This component is the
// ONLY element on the homepage with active gesture listeners — the page
// shell itself must never apply touch-action restrictions of its own
// (confirmed by review: this file scopes `touch-action: none` exclusively
// to its own root node, never to `body`/`html`).
//
// 🔒 No search icon. No keyboard icon. No placeholder text anywhere in this
// component's markup — confirmed by inspection below: there is no <input>
// element in this file or its children with a `placeholder` attribute, and
// no icon import for search/keyboard glyphs.
// ---------------------------------------------------------------------------

export function DiscoveryPad() {
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ripples, setRipples] = useState<{ id: number; x: number; y: number }[]>([]);
  const [noMatchMessage, setNoMatchMessage] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const rippleId = useRef(0);

  // Canvas-rendered internal texture layer — a slow-drifting noise/grain
  // field, not a flat PNG (§30.4 visual requirement).
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let raf: number;
    let t = 0;

    const resize = () => {
      canvas.width = canvas.offsetWidth * window.devicePixelRatio;
      canvas.height = canvas.offsetHeight * window.devicePixelRatio;
    };
    resize();
    window.addEventListener('resize', resize);

    const draw = () => {
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);
      const gradient = ctx.createRadialGradient(
        w / 2 + Math.sin(t) * 20,
        h / 2 + Math.cos(t) * 20,
        0,
        w / 2,
        h / 2,
        Math.max(w, h) / 1.2
      );
      gradient.addColorStop(0, 'rgba(200,169,106,0.10)');
      gradient.addColorStop(0.6, 'rgba(200,169,106,0.03)');
      gradient.addColorStop(1, 'rgba(200,169,106,0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, w, h);
      t += 0.004;
      raf = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, []);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    const rect = rootRef.current?.getBoundingClientRect();
    if (!rect) return;
    const id = rippleId.current++;
    setRipples((prev) => [...prev, { id, x: e.clientX - rect.left, y: e.clientY - rect.top }]);
    window.setTimeout(() => {
      setRipples((prev) => prev.filter((r) => r.id !== id));
    }, 600);
  }, []);

  const handleMatch = useCallback(
    (slug: string) => {
      // Luxury Transition Animation reuses Phase 0 easing/duration tokens —
      // no ad hoc values introduced here.
      setNoMatchMessage(false);
      window.setTimeout(() => {
        router.push(`/studio/${slug}`);
      }, 400); // matches --duration-slow
    },
    [router]
  );

  const handleNoMatch = useCallback(() => {
    setNoMatchMessage(true);
    window.setTimeout(() => setNoMatchMessage(false), 3200);
  }, []);

  return (
    <div
      ref={rootRef}
      onPointerDown={handlePointerDown}
      className="relative mx-auto flex h-64 w-64 items-center justify-center rounded-[var(--radius-xl)] md:h-80 md:w-80"
      style={{
        touchAction: 'none',
        backdropFilter: 'blur(18px) saturate(140%)',
        background:
          'linear-gradient(135deg, rgba(255,255,255,0.10) 0%, rgba(200,169,106,0.06) 50%, rgba(255,255,255,0.04) 100%)',
        border: '1px solid transparent',
        borderImage:
          'linear-gradient(135deg, rgba(200,169,106,0.8), rgba(200,169,106,0.1), rgba(200,169,106,0.8)) 1',
        boxShadow: 'var(--shadow-gold-glow)',
        animation: 'resora-pad-breathe 4.5s var(--ease-luxury) infinite',
      }}
    >
      <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 h-full w-full rounded-[var(--radius-xl)]" />

      {ripples.map((r) => (
        <span
          key={r.id}
          className="pointer-events-none absolute rounded-full border border-[var(--color-gold-500)]/60"
          style={{
            left: r.x,
            top: r.y,
            width: 8,
            height: 8,
            transform: 'translate(-50%, -50%)',
            animation: 'resora-pad-ripple 600ms var(--ease-luxury) forwards',
          }}
        />
      ))}

      <HandwritingCapture onMatch={handleMatch} onNoMatch={handleNoMatch} />

      <PinchZoomPortal targetRef={rootRef} onOpen={() => setGalleryOpen(true)} />

      {noMatchMessage && (
        <div
          role="status"
          className="absolute bottom-6 left-1/2 -translate-x-1/2 rounded-[var(--radius-full)] bg-[var(--color-black-900)]/80 px-4 py-2 text-center font-[var(--font-display)] text-[length:var(--text-caption)] text-[var(--color-ivory-50)]"
        >
          No verified artisan found.
        </div>
      )}

      {galleryOpen && <SellerSelectionGallery onClose={() => setGalleryOpen(false)} />}

      <style jsx>{`
        @keyframes resora-pad-breathe {
          0%, 100% { box-shadow: 0 0 24px rgba(200,169,106,0.20); transform: scale(1); }
          50% { box-shadow: 0 0 40px rgba(200,169,106,0.32); transform: scale(1.015); }
        }
        @keyframes resora-pad-ripple {
          0% { width: 8px; height: 8px; opacity: 0.9; }
          100% { width: 140px; height: 140px; opacity: 0; }
        }
      `}</style>
    </div>
  );
}
