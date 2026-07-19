/**
 * RSR-MOD-002 — Auto-framing pipeline.
 * Blueprint §30.9.1 / Phase 3.5 Step 5: "given an uploaded photo + a
 * category slug, crop/compose it into the mapped frame preset, applying
 * the fixed luxury-look filter set... implemented as real canvas
 * filter/composite operations."
 *
 * This is the single shared function both CanvasFramePreview.tsx
 * (preview-time) and the Phase 4 product-save pipeline (publish-time)
 * must call — per the Phase 4 amendment's acceptance criterion that
 * preview and published framing be pixel-identical because both call
 * the same function, never two separate implementations.
 *
 * 🔒 Canvas/2D compositing of the seller's own uploaded photo only. No
 * generative AI call anywhere in this file, per §30.3.1.
 */

import type { CropAnchor, FramePreset } from "./categoryFrameMap";
import {
  applyColorCurve,
  applyLuxuryLookFilterSet,
  drawShadowUnderlay,
  resetFilter,
} from "./luxuryFilters";

export interface FrameResult {
  canvas: HTMLCanvasElement;
  /** dataURL export, convenient for immediate <img>/upload use */
  dataUrl: string;
}

/**
 * Computes the source rectangle to crop from the source image so that,
 * once drawn into the target aspect ratio, the result respects the
 * frame preset's crop anchor without distortion (cover-fit, not stretch).
 */
function computeCropRect(
  sourceWidth: number,
  sourceHeight: number,
  targetAspectRatio: number,
  anchor: CropAnchor
): { sx: number; sy: number; sw: number; sh: number } {
  const sourceAspect = sourceWidth / sourceHeight;

  let sw = sourceWidth;
  let sh = sourceHeight;

  if (sourceAspect > targetAspectRatio) {
    // source is wider than target — crop width
    sw = sourceHeight * targetAspectRatio;
  } else {
    // source is taller than target — crop height
    sh = sourceWidth / targetAspectRatio;
  }

  let sx = (sourceWidth - sw) / 2;
  let sy = (sourceHeight - sh) / 2;

  switch (anchor) {
    case "top":
    case "top-center":
      sy = 0;
      break;
    case "bottom":
    case "bottom-center":
      sy = sourceHeight - sh;
      break;
    case "center":
    default:
      // already centered
      break;
  }

  return { sx, sy, sw, sh };
}

/**
 * Given a loaded HTMLImageElement and a resolved FramePreset, produces a
 * new canvas with the photo cropped into the preset's aspect ratio,
 * bordered per the preset, and finished with the fixed luxury filter set.
 *
 * @param targetWidth Output canvas width in px (height derived from
 *   preset.aspectRatio). Callers pass their own render resolution — this
 *   function does not assume a fixed export size.
 */
export function applyLuxuryFrame(
  canvas: HTMLCanvasElement,
  image: HTMLImageElement,
  preset: FramePreset,
  targetWidth?: number
): FrameResult {
  const width = targetWidth ?? canvas.width ?? 800;
  const height = Math.round(width / preset.aspectRatio);

  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Canvas 2D context unavailable");
  }

  ctx.clearRect(0, 0, width, height);

  // 1. Composition-template-specific underlay (shadow) before the image,
  //    for templates that place the product "on" a surface.
  if (
    preset.compositionTemplate === "pedestal-shadow" ||
    preset.compositionTemplate === "macro-centered"
  ) {
    const inset = width * 0.06;
    drawShadowUnderlay(ctx, inset, height - inset * 1.5, width - inset * 2, inset);
  }

  // 2. Crop + draw the seller's actual photo — the only image content
  //    that ever appears in the frame.
  const { sx, sy, sw, sh } = computeCropRect(
    image.naturalWidth,
    image.naturalHeight,
    preset.aspectRatio,
    preset.cropAnchor
  );

  applyColorCurve(ctx);
  ctx.drawImage(image, sx, sy, sw, sh, 0, 0, width, height);
  resetFilter(ctx);

  // 3. Fixed luxury-look filter set (vignette + grain), applied once,
  //    from the shared constants module.
  applyLuxuryLookFilterSet(ctx, width, height, preset.vignetteStyle);

  // 4. Border, per preset.
  if (preset.borderWidth > 0) {
    ctx.save();
    ctx.strokeStyle = resolveTokenColor(preset.borderColorToken);
    ctx.lineWidth = preset.borderWidth;
    ctx.strokeRect(
      preset.borderWidth / 2,
      preset.borderWidth / 2,
      width - preset.borderWidth,
      height - preset.borderWidth
    );
    ctx.restore();
  }

  return {
    canvas,
    dataUrl: canvas.toDataURL("image/jpeg", 0.92),
  };
}

/**
 * Resolves a CSS custom property token (e.g. "--color-gold-500") to its
 * computed color value, falling back to a safe neutral if the token
 * isn't found in the current document (e.g. during SSR/offscreen use).
 */
function resolveTokenColor(token: string): string {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return "#C8A96A"; // matches --color-gold-500 default, Ch.5.1
  }
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue(token)
    .trim();
  return value || "#C8A96A";
}
