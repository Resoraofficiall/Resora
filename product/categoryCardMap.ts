/**
 * RSR-PRD-007 — Category → card presentation variant map.
 *
 * Single source of truth for which visual card variant a product renders
 * in, per Blueprint §5.5 ("Cards — one base card component with
 * category-aware presentation variants") and §30.9.1 (category-aware
 * auto-framing table, same category taxonomy reused for card layout).
 *
 * This is a config lookup, not scattered per-component conditionals.
 * Extend this map — do not add new switch/if branches in ProductCard.tsx
 * or any variant component.
 *
 * Note: this governs which *card component* renders in listings/grids.
 * The Canvas Engine's categoryFrameMap (RSR-MOD-001,
 * modules/canvasEngine/categoryFrameMap.ts) governs the *auto-framing of
 * the uploaded photo itself* and is a separate, complementary config —
 * intentionally not merged into this file, since one drives layout choice
 * and the other drives image composition.
 */

export type CardVariant =
  | "wideHorizontal"
  | "circularFrame"
  | "tallVertical"
  | "compactRounded"
  | "galleryFrame";

/**
 * Default fallback variant for any category not present in the map below.
 * galleryFrame is the safest general-purpose presentation (works for
 * roughly square or portrait product photography without distortion).
 */
export const DEFAULT_CARD_VARIANT: CardVariant = "galleryFrame";

/**
 * Category slug → card variant. Category slugs must match the `category`
 * field stored on `products/{productId}` (Ch.6.2) and the categories
 * collection's slug field.
 *
 * Founder-configurability note: per §30.9.1, category→preset mapping must
 * be editable without a code rewrite. In V1 this map ships as code (fast,
 * reviewable), but any new admin editor (Phase 10) that changes card
 * presentation must write through to this same variant vocabulary
 * (CardVariant) rather than inventing new ad hoc layout keys — so keep
 * this union type as the single enum of allowed variants.
 */
export const categoryCardMap: Record<string, CardVariant> = {
  // Coasters / Trays — wide horizontal frame
  coasters: "wideHorizontal",
  trays: "wideHorizontal",
  "coasters-trays": "wideHorizontal",

  // Clocks — circular frame
  clocks: "circularFrame",

  // Bookmarks — tall vertical frame
  bookmarks: "tallVertical",

  // Keychains / small accessories — compact rounded frame
  keychains: "compactRounded",
  "small-accessories": "compactRounded",

  // Wall art / frames — gallery frame (landscape gallery presentation)
  "wall-art": "galleryFrame",
  frames: "galleryFrame",
  "wall-art-frames": "galleryFrame",

  // Jewelry — tall portrait, macro-style centered crop reads closest to
  // tallVertical among the five card variants
  jewelry: "tallVertical",

  // Vase / Home Decor — centered product frame reads closest to
  // galleryFrame (neutral, centered, no directional bias)
  vase: "galleryFrame",
  "home-decor": "galleryFrame",
};

/** Resolve a category slug to its card variant, applying the fallback. */
export function resolveCardVariant(categorySlug: string): CardVariant {
  return categoryCardMap[categorySlug] ?? DEFAULT_CARD_VARIANT;
}
