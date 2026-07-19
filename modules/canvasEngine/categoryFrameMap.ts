/**
 * RSR-MOD-001 — Category → frame preset config.
 * Blueprint §30.9.1 (Category-Aware Auto-Framing).
 *
 * This is the config object referenced by Phase 3.5 Step 5: "config
 * object (not scattered per-component conditionals) mapping category
 * slug → frame preset (aspect ratio, crop anchor, border/vignette style,
 * composition template)."
 *
 * 🔒 This module is the CODE-LEVEL default/fallback only. At runtime,
 * CanvasFramePreview.tsx and the Phase 4 product-save pipeline read the
 * live, Founder-editable version from Firestore
 * (settings/canvasEngineFrames), NOT this file directly — this file
 * exists so:
 *   1. The Firestore document can be seeded from a single source of truth
 *      the first time the app deploys (see seedCanvasEngineFrames below).
 *   2. There is always a safe, compiled-in default if the Firestore
 *      document is ever missing/corrupted (defensive fallback only,
 *      never the primary read path in production UI code).
 *
 * Extend this map by adding entries — never by adding per-component
 * switch/if branches elsewhere in the Canvas Engine or in ProductCard's
 * category→card-variant logic (that is a separate, complementary map:
 * see product/categoryCardMap.ts, RSR-PRD-007).
 */

export type CropAnchor =
  | "center"
  | "top"
  | "bottom"
  | "top-center"
  | "bottom-center";

export type VignetteStyle = "gold-soft" | "gold-strong" | "neutral-soft" | "none";

export type CompositionTemplate =
  | "macro-centered"
  | "pedestal-shadow"
  | "gallery-landscape"
  | "flat-lay-wide"
  | "compact-product";

export interface FramePreset {
  /** width / height, e.g. 0.75 for a tall 3:4 portrait frame */
  aspectRatio: number;
  cropAnchor: CropAnchor;
  vignetteStyle: VignetteStyle;
  compositionTemplate: CompositionTemplate;
  /** Border width in px at the frame's native render resolution */
  borderWidth: number;
  /** Border color token — always a token from styles/tokens.css, never a raw hex */
  borderColorToken: string;
}

/**
 * Default fallback preset for any category not present in
 * categoryFrameMap below. Per Phase 3.5 acceptance checklist: "An
 * unmapped/new category name correctly falls back to the default frame
 * preset rather than erroring."
 */
export const DEFAULT_FRAME_PRESET: FramePreset = {
  aspectRatio: 0.8,
  cropAnchor: "center",
  vignetteStyle: "gold-soft",
  compositionTemplate: "pedestal-shadow",
  borderWidth: 2,
  borderColorToken: "--color-gold-100",
};

/**
 * Seed table per Blueprint §30.9.1's example mapping. Extendable by the
 * Founder (via /admin/canvas-engine, Phase 10) without a code rewrite —
 * this object is the seed value written into
 * settings/canvasEngineFrames on first deploy, not the live source.
 */
export const categoryFrameMap: Record<string, FramePreset> = {
  jewelry: {
    aspectRatio: 0.75, // tall portrait
    cropAnchor: "center",
    vignetteStyle: "gold-strong",
    compositionTemplate: "macro-centered",
    borderWidth: 2,
    borderColorToken: "--color-gold-500",
  },
  vase: {
    aspectRatio: 0.85,
    cropAnchor: "center",
    vignetteStyle: "gold-soft",
    compositionTemplate: "pedestal-shadow",
    borderWidth: 2,
    borderColorToken: "--color-gold-100",
  },
  "home-decor": {
    aspectRatio: 0.85,
    cropAnchor: "center",
    vignetteStyle: "gold-soft",
    compositionTemplate: "pedestal-shadow",
    borderWidth: 2,
    borderColorToken: "--color-gold-100",
  },
  "wall-art": {
    aspectRatio: 1.33, // landscape gallery frame
    cropAnchor: "center",
    vignetteStyle: "neutral-soft",
    compositionTemplate: "gallery-landscape",
    borderWidth: 3,
    borderColorToken: "--color-gray-300",
  },
  frames: {
    aspectRatio: 1.33,
    cropAnchor: "center",
    vignetteStyle: "neutral-soft",
    compositionTemplate: "gallery-landscape",
    borderWidth: 3,
    borderColorToken: "--color-gray-300",
  },
  coasters: {
    aspectRatio: 1.78, // wide horizontal frame
    cropAnchor: "center",
    vignetteStyle: "gold-soft",
    compositionTemplate: "flat-lay-wide",
    borderWidth: 1,
    borderColorToken: "--color-gold-100",
  },
  trays: {
    aspectRatio: 1.78,
    cropAnchor: "center",
    vignetteStyle: "gold-soft",
    compositionTemplate: "flat-lay-wide",
    borderWidth: 1,
    borderColorToken: "--color-gold-100",
  },
  keychains: {
    aspectRatio: 1, // compact rounded frame
    cropAnchor: "center",
    vignetteStyle: "neutral-soft",
    compositionTemplate: "compact-product",
    borderWidth: 1,
    borderColorToken: "--color-gray-300",
  },
  "small-accessories": {
    aspectRatio: 1,
    cropAnchor: "center",
    vignetteStyle: "neutral-soft",
    compositionTemplate: "compact-product",
    borderWidth: 1,
    borderColorToken: "--color-gray-300",
  },
  clocks: {
    aspectRatio: 1,
    cropAnchor: "center",
    vignetteStyle: "gold-soft",
    compositionTemplate: "compact-product",
    borderWidth: 2,
    borderColorToken: "--color-gold-100",
  },
  bookmarks: {
    aspectRatio: 0.6,
    cropAnchor: "center",
    vignetteStyle: "neutral-soft",
    compositionTemplate: "macro-centered",
    borderWidth: 1,
    borderColorToken: "--color-gray-300",
  },
};

/** Resolve a category slug to its frame preset, applying the fallback. */
export function resolveFramePreset(categorySlug: string): FramePreset {
  return categoryFrameMap[categorySlug] ?? DEFAULT_FRAME_PRESET;
}

/**
 * Seed payload for settings/canvasEngineFrames — used once by a Phase 3
 * deploy/migration script (not called from client UI code) to initialize
 * the live Firestore document from this file's values.
 */
export function buildSeedDocument() {
  return {
    frames: categoryFrameMap,
    defaultFrame: DEFAULT_FRAME_PRESET,
  };
}
