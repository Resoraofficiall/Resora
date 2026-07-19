'use client';

import { useEffect, useRef, useState, type RefObject } from 'react';

// ---------------------------------------------------------------------------
// RSR-CMP-012 — components/DiscoveryPad/PinchZoomPortal.tsx
// Blueprint §30.6 (Mode 2). Pinch-gesture detection scoped strictly to the
// Discovery Pad's DOM node. `touch-action: none` is applied only within the
// Pad's own bounding box (via the parent's inline style — this component
// adds its own pointer-event distance tracking on top, never a global
// gesture listener on window/document beyond move/up needed mid-gesture).
//
// Pinching anywhere on the homepage OUTSIDE the Pad must produce zero
// response here, because this component only ever attaches listeners to
// `targetRef.current` — never to `document` for the down/start event.
// ---------------------------------------------------------------------------

interface PinchZoomPortalProps {
  targetRef: RefObject<HTMLDivElement>;
  onOpen: () => void;
}

const PINCH_THRESHOLD_PX = 60;

export function PinchZoomPortal({ targetRef, onOpen }: PinchZoomPortalProps) {
  const [phase, setPhase] = useState<'idle' | 'separating' | 'particles' | 'portal'>('idle');
  const pointers = useRef<Map<number, { x: number; y: number }>>(new Map());
  const startDistance = useRef<number | null>(null);
  const triggered = useRef(false);

  useEffect(() => {
    const el = targetRef.current;
    if (!el) return;

    const distance = () => {
      const pts = Array.from(pointers.current.values());
      if (pts.length < 2) return null;
      const [a, b] = pts;
      return Math.hypot(a.x - b.x, a.y - b.y);
    };

    const onPointerDown = (e: PointerEvent) => {
      pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.current.size === 2) {
        startDistance.current = distance();
        triggered.current = false;
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!pointers.current.has(e.pointerId)) return;
      pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.current.size !== 2 || startDistance.current === null || triggered.current) return;

      const current = distance();
      if (current === null) return;
      const delta = current - startDistance.current;

      if (Math.abs(delta) > PINCH_THRESHOLD_PX) {
        // Native browser zoom is prevented for this gesture — the pad's own
        // touch-action: none (set on its root, not the page) already blocks
        // it; this call is a defensive second layer for browsers that still
        // dispatch a native gesture event.
        e.preventDefault();
        triggered.current = true;
        runPortalSequence();
      }
    };

    const onPointerUpOrCancel = (e: PointerEvent) => {
      pointers.current.delete(e.pointerId);
      if (pointers.current.size < 2) startDistance.current = null;
    };

    el.addEventListener('pointerdown', onPointerDown);
    el.addEventListener('pointermove', onPointerMove);
    el.addEventListener('pointerup', onPointerUpOrCancel);
    el.addEventListener('pointercancel', onPointerUpOrCancel);

    return () => {
      el.removeEventListener('pointerdown', onPointerDown);
      el.removeEventListener('pointermove', onPointerMove);
      el.removeEventListener('pointerup', onPointerUpOrCancel);
      el.removeEventListener('pointercancel', onPointerUpOrCancel);
    };
  }, [targetRef]);

  const runPortalSequence = () => {
    setPhase('separating');
    window.setTimeout(() => setPhase('particles'), 250); // --duration-base
    window.setTimeout(() => setPhase('portal'), 500);
    window.setTimeout(() => {
      onOpen();
      setPhase('idle');
    }, 900); // full sequence within the --duration-hero neighborhood
  };

  if (phase === 'idle') return null;

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[var(--radius-xl)]">
      {phase === 'separating' && (
        <div
          className="absolute inset-0 rounded-[var(--radius-xl)] border border-[var(--color-gold-500)]/50"
          style={{ animation: 'resora-glass-separate 250ms var(--ease-luxury) forwards' }}
        />
      )}
      {(phase === 'particles' || phase === 'portal') && (
        <div className="absolute inset-0" style={{ animation: 'resora-particles 400ms var(--ease-luxury) forwards' }}>
          {Array.from({ length: 12 }).map((_, i) => (
            <span
              key={i}
              className="absolute h-1 w-1 rounded-full bg-[var(--color-gold-500)]"
              style={{
                left: `${50 + Math.cos((i / 12) * Math.PI * 2) * 40}%`,
                top: `${50 + Math.sin((i / 12) * Math.PI * 2) * 40}%`,
                opacity: 0.7,
              }}
            />
          ))}
        </div>
      )}
      {phase === 'portal' && (
        <div
          className="absolute inset-0 rounded-full bg-[var(--color-black-900)]"
          style={{ animation: 'resora-portal-open 400ms var(--ease-luxury) forwards' }}
        />
      )}
      <style jsx>{`
        @keyframes resora-glass-separate {
          0% { transform: scale(1); opacity: 1; }
          100% { transform: scale(1.08); opacity: 0.3; }
        }
        @keyframes resora-particles {
          0% { opacity: 0; }
          100% { opacity: 1; }
        }
        @keyframes resora-portal-open {
          0% { transform: scale(0.1); opacity: 0; }
          100% { transform: scale(3); opacity: 0.9; }
        }
      `}</style>
    </div>
  );
}
