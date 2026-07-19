/**
 * RSR-MOD-005 — Canvas Engine public entry point.
 *
 * Every consumer outside /modules/canvasEngine (CanvasFramePreview.tsx,
 * the Phase 4 product-save pipeline, the future /admin/canvas-engine
 * editor) imports from this barrel file — never reaching into individual
 * module files directly — so the internal file layout can change without
 * breaking call sites, and so there is exactly one public surface to
 * audit for the §30.3.1 "no generative AI call" guarantee.
 */

export {
  categoryFrameMap,
  DEFAULT_FRAME_PRESET,
  resolveFramePreset,
  buildSeedDocument,
  type FramePreset,
  type CropAnchor,
  type VignetteStyle,
  type CompositionTemplate,
} from "./categoryFrameMap";

export {
  LUXURY_FILTER_PARAMS,
  applyColorCurve,
  resetFilter,
  drawVignette,
  drawGrain,
  drawShadowUnderlay,
  applyLuxuryLookFilterSet,
} from "./luxuryFilters";

export { applyLuxuryFrame, type FrameResult } from "./autoFraming";

export {
  assemblePhotoToVideo,
  type PhotoToVideoOptions,
} from "./photoToVideo";
