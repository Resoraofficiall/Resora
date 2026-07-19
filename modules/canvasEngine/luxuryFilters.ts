/**
 * RSR-MOD-003 — Luxury filter constants + canvas filter/composite ops.
 * Blueprint §30.3.1 / §30.9.1: "the fixed luxury-look filter set
 * (gold-tinted vignette, contrast/curve adjustment, subtle grain, soft
 * shadow underlay) — implemented as real canvas filter/composite
 * operations, each filter's parameters defined once in a shared
 * constants file, not duplicated per call site."
 *
 * 🔒 Deterministic canvas/2D compositing only. No calls to any
 * image-generation model anywhere in this file, per §30.3.1.
 */

import type { VignetteStyle } from "./categoryFrameMap";

/** Every numeric filter parameter lives here — the single shared source
 * every call site (autoFraming.ts, admin preview, etc.) must import from. */
export const LUXURY_FILTER_PARAMS = {
  contrast: 1.08,
  brightness: 1.02,
  saturation: 1.04,
  grainOpacity: 0.035,
  grainSize: 1, // px, size of the noise cell before scaling
  shadowBlur: 24,
  shadowOffsetY: 12,
  shadowColor: "rgba(11,11,11,0.22)", // derived from --color-black-950
  vignette: {
    "gold-soft": { color: "rgba(200,169,106,0.14)", radiusFactor: 0.75 },
    "gold-strong": { color: "rgba(176,141,79,0.24)", radiusFactor: 0.65 },
    "neutral-soft": { color: "rgba(11,11,11,0.12)", radiusFactor: 0.8 },
    none: { color: "rgba(0,0,0,0)", radiusFactor: 1 },
  } satisfies Record<VignetteStyle, { color: string; radiusFactor: number }>,
} as const;

/**
 * Applies contrast/brightness/saturation adjustment via the canvas
 * `filter` CSS property — the browser-native, GPU-accelerated path for
 * these three adjustments, avoiding a manual per-pixel loop.
 */
export function applyColorCurve(ctx: CanvasRenderingContext2D): void {
  const { contrast, brightness, saturation } = LUXURY_FILTER_PARAMS;
  ctx.filter = `contrast(${contrast}) brightness(${brightness}) saturate(${saturation})`;
}

export function resetFilter(ctx: CanvasRenderingContext2D): void {
  ctx.filter = "none";
}

/**
 * Draws a radial gold-tinted (or neutral) vignette over the given canvas
 * region, per the vignette style resolved from the active frame preset.
 */
export function drawVignette(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  style: VignetteStyle
): void {
  const { color, radiusFactor } = LUXURY_FILTER_PARAMS.vignette[style];
  if (style === "none") return;

  const cx = width / 2;
  const cy = height / 2;
  const outerRadius = Math.max(width, height) * radiusFactor;

  const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, outerRadius);
  gradient.addColorStop(0, "rgba(0,0,0,0)");
  gradient.addColorStop(1, color);

  ctx.save();
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();
}

/**
 * Draws subtle film grain by compositing a small tiled noise pattern at
 * low opacity — deterministic per-call (seeded), not a per-pixel random
 * walk on every frame, so repeated renders of the same source photo are
 * visually stable rather than flickering between calls.
 */
export function drawGrain(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  seed = 42
): void {
  const { grainOpacity, grainSize } = LUXURY_FILTER_PARAMS;

  const patternCanvas = document.createElement("canvas");
  const tile = 64;
  patternCanvas.width = tile;
  patternCanvas.height = tile;
  const pctx = patternCanvas.getContext("2d");
  if (!pctx) return;

  const imageData = pctx.createImageData(tile, tile);
  let s = seed;
  const rand = () => {
    // simple deterministic LCG so the grain pattern is stable, not
    // re-randomized every render
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };

  for (let i = 0; i < imageData.data.length; i += 4) {
    const v = Math.floor(rand() * 255);
    imageData.data[i] = v;
    imageData.data[i + 1] = v;
    imageData.data[i + 2] = v;
    imageData.data[i + 3] = 255;
  }
  pctx.putImageData(imageData, 0, 0);

  const pattern = ctx.createPattern(patternCanvas, "repeat");
  if (!pattern) return;

  ctx.save();
  ctx.globalAlpha = grainOpacity;
  ctx.globalCompositeOperation = "overlay";
  ctx.fillStyle = pattern;
  ctx.scale(grainSize, grainSize);
  ctx.fillRect(0, 0, width / grainSize, height / grainSize);
  ctx.restore();
}

/**
 * Draws a soft drop shadow underlay behind the product's bounding box —
 * used by pedestal-shadow and macro-centered composition templates to
 * give the product a sense of being placed on a surface rather than
 * floating flat.
 */
export function drawShadowUnderlay(
  ctx: CanvasRenderingContext2D,
  boxX: number,
  boxY: number,
  boxWidth: number,
  boxHeight: number
): void {
  const { shadowBlur, shadowOffsetY, shadowColor } = LUXURY_FILTER_PARAMS;

  ctx.save();
  ctx.shadowColor = shadowColor;
  ctx.shadowBlur = shadowBlur;
  ctx.shadowOffsetY = shadowOffsetY;
  ctx.fillStyle = "rgba(0,0,0,0.001)"; // near-invisible fill, shadow does the work
  ctx.fillRect(boxX, boxY, boxWidth, boxHeight);
  ctx.restore();
}

/**
 * Applies the complete fixed luxury-look filter set, in the documented
 * order, to an already-drawn canvas region. Called once per composite by
 * autoFraming.ts — never re-implemented per call site.
 */
export function applyLuxuryLookFilterSet(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  vignetteStyle: VignetteStyle
): void {
  drawVignette(ctx, width, height, vignetteStyle);
  drawGrain(ctx, width, height);
}
