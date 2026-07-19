/**
 * components/OpeningCinematic.tsx
 * RSR-CMP-009
 *
 * First-visit opening sequence — locked spec (Blueprint §5.6, amended
 * by §30.2). GSAP is reserved ONLY for this component (Blueprint §18.1)
 * — it must not be imported anywhere else in the codebase.
 *
 * Two variants per §30.2:
 *  - Guest:         "Welcome." / "Discover Extraordinary Craftsmanship."
 *  - Authenticated:  "Hello," / "{First Name}"
 *
 * The Authenticated variant reads displayName from Firestore
 * users/{uid} (synced from Google Sign-In at first login) — never
 * directly from the Firebase Auth object on every load. Guest opening
 * must NEVER attempt a Firestore read (verified in Phase 0 acceptance
 * checklist via network tab).
 *
 * Text animation is a stroke-in / hand-lettered path animation —
 * explicitly not a typewriter effect, not a plain fade — original,
 * not a copy of any known product's splash screen.
 */

"use client";

import * as React from "react";
import { gsap } from "gsap";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebaseClient";

const SEEN_FLAG_KEY = "resora_opening_seen";
const SKIP_ENABLED_AFTER_MS = 800;
const HARD_CAP_MS = 3500;
const RETURNING_VARIANT_MS = 400;
const REDUCED_MOTION_CROSSFADE_MS = 300;

export interface OpeningCinematicProps {
  /** Pass the signed-in uid, or null/undefined for a guest visitor. Never pass the Auth displayName directly — this component resolves it from Firestore itself. */
  authenticatedUid?: string | null;
  onComplete?: () => void;
}

type Phase = "idle" | "playing" | "done";

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function OpeningCinematic({ authenticatedUid, onComplete }: OpeningCinematicProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const line1Ref = React.useRef<SVGTextElement>(null);
  const line2Ref = React.useRef<SVGTextElement>(null);
  const glowRef = React.useRef<HTMLDivElement>(null);

  const [phase, setPhase] = React.useState<Phase>("idle");
  const [canSkip, setCanSkip] = React.useState(false);
  const [firstName, setFirstName] = React.useState<string | null>(null);
  const [isReturning, setIsReturning] = React.useState(false);
  const [shouldRender, setShouldRender] = React.useState(false);
  const timelineRef = React.useRef<gsap.core.Timeline | null>(null);
  const hardCapTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // Decide once per mount whether to render at all, and whether this is
  // a first-visit (full sequence) or returning-visitor (400ms flash) pass.
  React.useEffect(() => {
    const seen = typeof window !== "undefined" && window.localStorage.getItem(SEEN_FLAG_KEY) === "true";
    setIsReturning(seen);
    setShouldRender(true);
  }, []);

  // Authenticated variant resolves displayName from Firestore users/{uid}.
  // Guest variant intentionally performs zero Firestore reads.
  React.useEffect(() => {
    let cancelled = false;
    async function loadName() {
      if (!authenticatedUid) return;
      const snap = await getDoc(doc(db, "users", authenticatedUid));
      if (!cancelled && snap.exists()) {
        const data = snap.data() as { displayName?: string };
        const first = data.displayName?.trim().split(/\s+/)[0] ?? null;
        setFirstName(first);
      }
    }
    loadName();
    return () => {
      cancelled = true;
    };
  }, [authenticatedUid]);

  const finish = React.useCallback(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(SEEN_FLAG_KEY, "true");
    }
    if (hardCapTimeoutRef.current) clearTimeout(hardCapTimeoutRef.current);
    timelineRef.current?.kill();
    setPhase("done");
    onComplete?.();
  }, [onComplete]);

  React.useEffect(() => {
    if (!shouldRender || phase !== "idle") return;
    if (authenticatedUid && firstName === null) return; // wait for name resolution before animating the authenticated line

    setPhase("playing");

    const reduced = prefersReducedMotion();

    if (reduced) {
      // Simple crossfade fallback, no particles/doors/parallax.
      gsap.fromTo(
        containerRef.current,
        { opacity: 1 },
        {
          opacity: 0,
          duration: REDUCED_MOTION_CROSSFADE_MS / 1000,
          delay: 0.3,
          onComplete: finish,
        }
      );
      setCanSkip(true);
      return;
    }

    if (isReturning) {
      // Returning-visitor variant: 400ms logo-mark flash only.
      const tl = gsap.timeline({ onComplete: finish });
      timelineRef.current = tl;
      tl.fromTo(glowRef.current, { opacity: 0 }, { opacity: 1, duration: RETURNING_VARIANT_MS / 1000 / 2 }).to(
        containerRef.current,
        { opacity: 0, duration: RETURNING_VARIANT_MS / 1000 / 2 }
      );
      setCanSkip(true);
      return;
    }

    // First-visit full sequence: black frame → gold glow (400ms) →
    // logo/text stroke-in (600ms) → tagline fade (400ms) → homepage
    // crossfades in underneath (800ms).
    const tl = gsap.timeline({ onComplete: finish });
    timelineRef.current = tl;

    tl.set(containerRef.current, { opacity: 1 })
      .fromTo(glowRef.current, { opacity: 0 }, { opacity: 1, duration: 0.4, ease: "power2.out" })
      .call(() => {
        // Stroke-in / hand-lettered draw for line 1, driven by stroke-dashoffset.
        if (line1Ref.current) {
          const length = line1Ref.current.getComputedTextLength();
          gsap.set(line1Ref.current, {
            strokeDasharray: length,
            strokeDashoffset: length,
            opacity: 1,
          });
          gsap.to(line1Ref.current, {
            strokeDashoffset: 0,
            duration: 0.6,
            ease: "power2.inOut",
          });
        }
      })
      .to({}, { duration: 0.6 }) // hold for line 1 draw duration
      .fromTo(
        line2Ref.current,
        { opacity: 0 },
        { opacity: 1, duration: 0.4, ease: "power2.out" }
      )
      .call(() => setCanSkip(true), undefined, 0.8 / 1000 === 0 ? undefined : undefined)
      .to(containerRef.current, { opacity: 0, duration: 0.8, ease: "power2.inOut" }, "+=0.2");

    // Skip becomes available 800ms after the sequence starts, independent of animation progress.
    const skipTimer = setTimeout(() => setCanSkip(true), SKIP_ENABLED_AFTER_MS);
    hardCapTimeoutRef.current = setTimeout(finish, HARD_CAP_MS);

    return () => {
      clearTimeout(skipTimer);
    };
  }, [shouldRender, phase, isReturning, authenticatedUid, firstName, finish]);

  const handleSkipInteraction = React.useCallback(() => {
    if (canSkip) finish();
  }, [canSkip, finish]);

  React.useEffect(() => {
    if (!canSkip) return;
    const handleKeydown = () => handleSkipInteraction();
    window.addEventListener("keydown", handleKeydown);
    return () => window.removeEventListener("keydown", handleKeydown);
  }, [canSkip, handleSkipInteraction]);

  if (!shouldRender || phase === "done") return null;

  const line1 = authenticatedUid ? "Hello," : "Welcome.";
  const line2 = authenticatedUid ? firstName ?? "" : "Discover Extraordinary Craftsmanship.";

  return (
    <div
      ref={containerRef}
      role="presentation"
      onClick={handleSkipInteraction}
      onTouchStart={handleSkipInteraction}
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[var(--color-black-950)] cursor-pointer"
    >
      <div
        ref={glowRef}
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(circle at 50% 50%, rgba(200,169,106,0.18), transparent 60%)",
        }}
        aria-hidden="true"
      />

      <svg width="480" height="160" viewBox="0 0 480 160" className="relative">
        <text
          ref={line1Ref}
          x="240"
          y="70"
          textAnchor="middle"
          fontFamily="var(--font-display)"
          fontSize="36"
          fill="var(--color-ivory-100)"
          stroke="var(--color-ivory-100)"
          strokeWidth="0.75"
          opacity="0"
        >
          {line1}
        </text>
        <text
          ref={line2Ref}
          x="240"
          y="110"
          textAnchor="middle"
          fontFamily="var(--font-body)"
          fontSize="18"
          fill="var(--color-gold-500)"
          opacity="0"
        >
          {line2}
        </text>
      </svg>
    </div>
  );
}

export default OpeningCinematic;
