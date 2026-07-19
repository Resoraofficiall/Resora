"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebaseClient";
import {
  applyLuxuryFrame,
  type FramePreset,
} from "@/modules/canvasEngine";

/**
 * RSR-PRD-008 — Card Frame Preview.
 * Phase 3.5, Step 6 ("feeds Phase 4").
 *
 * Given a product's category slug + one uploaded photo, renders a live
 * preview of the resulting auto-framed card exactly as the Resora Canvas
 * Engine (RSR-MOD-001..005) would compose it. This is the reusable piece
 * Phase 4's seller product form embeds when a seller uploads images —
 * this component owns the framing/preview logic once, so Phase 4 does
 * not reimplement it.
 *
 * 🔒 Deterministic only: this renders canvas compositing of the seller's
 * own uploaded photo (crop + luxury filter), per §30.3.1 / §30.9. No
 * call to any image-generation API is made here or anywhere it imports.
 *
 * categoryFrameMap is read live from Firestore (settings/canvasEngineFrames)
 * per the Phase 3.5 acceptance checklist — never hardcoded/bundled at
 * build time — so a Founder edit in Firestore reflects here without a
 * redeploy.
 */

export interface CanvasFramePreviewProps {
  /** Category slug as stored on products/{productId}.category (Ch.6.2) */
  categorySlug: string;
  /** Local object URL or remote URL of the seller's uploaded photo */
  imageSrc: string | null;
  /** Optional explicit size; defaults to a reasonable preview box */
  width?: number;
  className?: string;
}

interface CanvasEngineFramesDoc {
  frames: Record<string, FramePreset>;
  defaultFrame: FramePreset;
}

export default function CanvasFramePreview({
  categorySlug,
  imageSrc,
  width = 320,
  className = "",
}: CanvasFramePreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [framesDoc, setFramesDoc] = useState<CanvasEngineFramesDoc | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  // Live subscription to settings/canvasEngineFrames — required by the
  // Phase 3.5 acceptance checklist (Founder edits reflect without redeploy).
  useEffect(() => {
    const ref = doc(db, "settings", "canvasEngineFrames");
    const unsubscribe = onSnapshot(
      ref,
      (snap) => {
        if (snap.exists()) {
          setFramesDoc(snap.data() as CanvasEngineFramesDoc);
        } else {
          setStatus("error");
        }
      },
      () => setStatus("error")
    );
    return () => unsubscribe();
  }, []);

  const activePreset: FramePreset | null = useMemo(() => {
    if (!framesDoc) return null;
    return framesDoc.frames[categorySlug] ?? framesDoc.defaultFrame;
  }, [framesDoc, categorySlug]);

  useEffect(() => {
    if (!imageSrc || !activePreset || !canvasRef.current) return;

    let cancelled = false;
    setStatus("loading");

    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      if (cancelled || !canvasRef.current) return;
      try {
        applyLuxuryFrame(canvasRef.current, img, activePreset);
        setStatus("ready");
      } catch {
        setStatus("error");
      }
    };
    img.onerror = () => setStatus("error");
    img.src = imageSrc;

    return () => {
      cancelled = true;
    };
  }, [imageSrc, activePreset]);

  const height = activePreset
    ? Math.round(width / activePreset.aspectRatio)
    : Math.round(width * 1.25);

  if (!imageSrc) {
    return (
      <div
        style={{ width, height }}
        className={`flex items-center justify-center rounded-[var(--radius-md)] border border-dashed border-[var(--color-gray-300)] bg-[var(--color-gray-100)] text-[var(--color-gray-500)] ${className}`}
      >
        <p className="px-4 text-center text-[var(--text-caption)]">
          Upload a photo to preview its auto-framed card
        </p>
      </div>
    );
  }

  return (
    <div
      style={{ width }}
      className={`overflow-hidden rounded-[var(--radius-md)] shadow-[var(--shadow-card)] ${className}`}
    >
      <div style={{ width, height }} className="relative bg-[var(--color-gray-100)]">
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          className={`absolute inset-0 h-full w-full transition-opacity duration-[var(--duration-base)] ease-[var(--ease-luxury)] ${
            status === "ready" ? "opacity-100" : "opacity-0"
          }`}
        />

        {status === "loading" && (
          <div className="absolute inset-0 animate-pulse bg-[var(--color-gray-100)]" />
        )}

        {status === "error" && (
          <div className="absolute inset-0 flex items-center justify-center bg-[var(--color-gray-100)] text-[var(--color-gray-500)]">
            <p className="px-4 text-center text-[var(--text-caption)]">
              Preview unavailable — try re-uploading the photo
            </p>
          </div>
        )}
      </div>

      {activePreset && (
        <p className="mt-1 text-center text-[var(--text-micro)] text-[var(--color-gray-500)]">
          {framesDoc?.frames[categorySlug] ? categorySlug : "default"} frame preset
        </p>
      )}
    </div>
  );
}
