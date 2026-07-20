/**
 * services/canvasEngineService.ts
 * RSR-SVC (Resora Canvas Engine — Blueprint §30.9/§30.9.1, Phase 3.5)
 *
 * Deterministic, non-AI: canvas/WebGL compositing and image
 * manipulation only. No call to any image- or video-generation model
 * exists anywhere in this file. categoryFrameMap is read from
 * settings/canvasEngineFrames (Firestore), not hardcoded, so the
 * Phase 10 /admin/canvas-engine editor can change it with no redeploy.
 */

import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "@/lib/firebaseClient";

export interface FramePreset {
  aspectRatio: number; // width / height
  cropAnchor: "center" | "top" | "bottom" | "left" | "right";
  vignette: boolean;
  compositionTemplate: "single" | "grid" | "spotlight";
}

export type CategoryFrameMap = Record<string, FramePreset>;

const DEFAULT_FRAME_PRESET: FramePreset = {
  aspectRatio: 1,
  cropAnchor: "center",
  vignette: true,
  compositionTemplate: "single",
};

const LUXURY_FILTER_PARAMS = {
  goldVignetteStrength: 0.35,
  contrast: 1.08,
  curveGamma: 1.05,
  grainOpacity: 0.04,
  shadowUnderlayOpacity: 0.12,
} as const;

const SETTINGS_DOC = doc(db, "settings", "canvasEngineFrames");

export async function getCategoryFrameMap(): Promise<CategoryFrameMap> {
  const snap = await getDoc(SETTINGS_DOC);
  if (!snap.exists()) {
    return { default: DEFAULT_FRAME_PRESET };
  }
  const data = snap.data() as { frames?: CategoryFrameMap };
  return { default: DEFAULT_FRAME_PRESET, ...(data.frames ?? {}) };
}

export async function getFramePresetForCategory(categorySlug: string): Promise<FramePreset> {
  const map = await getCategoryFrameMap();
  return map[categorySlug] ?? map.default ?? DEFAULT_FRAME_PRESET;
}

/** Founder-only write, gated by Firestore Security Rules — used by /admin/canvas-engine (Phase 10). */
export async function updateCategoryFrameMap(map: CategoryFrameMap): Promise<void> {
  await setDoc(
    SETTINGS_DOC,
    { frames: map, updatedAt: serverTimestamp() },
    { merge: true }
  );
}

/**
 * Loads an image File into an HTMLImageElement for canvas processing.
 */
function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = (err) => {
      URL.revokeObjectURL(url);
      reject(err);
    };
    img.src = url;
  });
}

/**
 * Crops/composes a source image into the mapped frame preset and applies
 * the fixed luxury-look filter set via real canvas compositing
 * operations — gold-tinted vignette, contrast/curve adjustment, subtle
 * grain, soft shadow underlay. Pure pixel manipulation of the existing
 * photo; nothing is invented or generated.
 */
export async function applyAutoFraming(file: File, preset: FramePreset): Promise<Blob> {
  const img = await loadImage(file);

  const targetWidth = 1200;
  const targetHeight = Math.round(targetWidth / preset.aspectRatio);

  const canvas = document.createElement("canvas");
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("[canvasEngineService] Canvas 2D context unavailable.");

  // ── Crop-to-fill per anchor ──
  const sourceAspect = img.width / img.height;
  const targetAspect = preset.aspectRatio;
  let sx = 0;
  let sy = 0;
  let sw = img.width;
  let sh = img.height;

  if (sourceAspect > targetAspect) {
    sw = img.height * targetAspect;
    sx =
      preset.cropAnchor === "left" ? 0 : preset.cropAnchor === "right" ? img.width - sw : (img.width - sw) / 2;
  } else {
    sh = img.width / targetAspect;
    sy =
      preset.cropAnchor === "top" ? 0 : preset.cropAnchor === "bottom" ? img.height - sh : (img.height - sh) / 2;
  }

  ctx.filter = `contrast(${LUXURY_FILTER_PARAMS.contrast})`;
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, targetWidth, targetHeight);
  ctx.filter = "none";

  // ── Curve/gamma adjustment ──
  const imageData = ctx.getImageData(0, 0, targetWidth, targetHeight);
  const gammaCorrection = 1 / LUXURY_FILTER_PARAMS.curveGamma;
  const gammaLut = new Uint8ClampedArray(256);
  for (let i = 0; i < 256; i++) {
    gammaLut[i] = Math.round(255 * Math.pow(i / 255, gammaCorrection));
  }
  const pixels = imageData.data;
  for (let i = 0; i < pixels.length; i += 4) {
    pixels[i] = gammaLut[pixels[i]];
    pixels[i + 1] = gammaLut[pixels[i + 1]];
    pixels[i + 2] = gammaLut[pixels[i + 2]];
  }
  ctx.putImageData(imageData, 0, 0);

  // ── Gold-tinted vignette ──
  if (preset.vignette) {
    const gradient = ctx.createRadialGradient(
      targetWidth / 2,
      targetHeight / 2,
      Math.min(targetWidth, targetHeight) * 0.3,
      targetWidth / 2,
      targetHeight / 2,
      Math.max(targetWidth, targetHeight) * 0.7
    );
    gradient.addColorStop(0, "rgba(200,169,106,0)");
    gradient.addColorStop(1, `rgba(11,11,11,${LUXURY_FILTER_PARAMS.goldVignetteStrength})`);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, targetWidth, targetHeight);
  }

  // ── Soft shadow underlay ──
  ctx.fillStyle = `rgba(11,11,11,${LUXURY_FILTER_PARAMS.shadowUnderlayOpacity})`;
  ctx.fillRect(0, targetHeight * 0.85, targetWidth, targetHeight * 0.15);

  // ── Subtle grain ──
  const grainCanvas = document.createElement("canvas");
  grainCanvas.width = targetWidth;
  grainCanvas.height = targetHeight;
  const grainCtx = grainCanvas.getContext("2d");
  if (grainCtx) {
    const grainData = grainCtx.createImageData(targetWidth, targetHeight);
    for (let i = 0; i < grainData.data.length; i += 4) {
      const value = Math.random() * 255;
      grainData.data[i] = value;
      grainData.data[i + 1] = value;
      grainData.data[i + 2] = value;
      grainData.data[i + 3] = 255;
    }
    grainCtx.putImageData(grainData, 0, 0);
    ctx.globalAlpha = LUXURY_FILTER_PARAMS.grainOpacity;
    ctx.globalCompositeOperation = "overlay";
    ctx.drawImage(grainCanvas, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
  }

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Canvas toBlob failed"))),
      "image/jpeg",
      0.92
    );
  });
}

/**
 * Generates the framed hero image for a product and uploads it to
 * Storage. Preview-time (Phase 3.5 live preview) and publish-time
 * (Phase 4 product save) both call this exact function — never two
 * separate implementations of the framing logic.
 */
export async function generateFramedHeroImage({
  studioId,
  productDraftId,
  file,
  categorySlug,
}: {
  studioId: string;
  productDraftId: string;
  file: File;
  categorySlug: string;
}): Promise<string> {
  const preset = await getFramePresetForCategory(categorySlug);
  const blob = await applyAutoFraming(file, preset);

  const storagePath = `studios/${studioId}/products/${productDraftId}/hero.jpg`;
  const storageRef = ref(storage, storagePath);
  await uploadBytes(storageRef, blob, { contentType: "image/jpeg" });
  return getDownloadURL(storageRef);
}

/**
 * Photo-to-video assembler: composites 4–5 existing stills into a
 * pan/zoom (Ken Burns) + crossfade video. Compositing only — no new
 * frames are invented and no interpolation fabricates content absent
 * from the source photos.
 */
export async function generatePhotoToVideo({
  studioId,
  productDraftId,
  files,
}: {
  studioId: string;
  productDraftId: string;
  files: File[];
}): Promise<string> {
  if (files.length < 4 || files.length > 5) {
    throw new Error("[canvasEngineService] photo-to-video requires 4–5 source stills.");
  }

  const images = await Promise.all(files.map(loadImage));

  const width = 1080;
  const height = 1080;
  const perImageDurationSec = 2.2;
  const fps = 30;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("[canvasEngineService] Canvas 2D context unavailable.");

  const stream = canvas.captureStream(fps);
  const recorder = new MediaRecorder(stream, { mimeType: "video/webm;codecs=vp9" });
  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };

  const recordingDone = new Promise<Blob>((resolve) => {
    recorder.onstop = () => resolve(new Blob(chunks, { type: "video/webm" }));
  });

  recorder.start();

  const drawFrame = (img: HTMLImageElement, progress: number, alpha: number) => {
    const scale = 1.08 - 0.08 * progress; // gentle Ken Burns zoom-out
    const drawWidth = width * scale;
    const drawHeight = height * scale;
    const offsetX = (width - drawWidth) / 2;
    const offsetY = (height - drawHeight) / 2;

    const sourceAspect = img.width / img.height;
    const targetAspect = width / height;
    let sx = 0;
    let sy = 0;
    let sw = img.width;
    let sh = img.height;
    if (sourceAspect > targetAspect) {
      sw = img.height * targetAspect;
      sx = (img.width - sw) / 2;
    } else {
      sh = img.width / targetAspect;
      sy = (img.height - sh) / 2;
    }

    ctx.globalAlpha = alpha;
    ctx.drawImage(img, sx, sy, sw, sh, offsetX, offsetY, drawWidth, drawHeight);
    ctx.globalAlpha = 1;
  };

  const totalFrames = Math.round(images.length * perImageDurationSec * fps);
  const framesPerImage = Math.round(perImageDurationSec * fps);
  const crossfadeFrames = Math.round(0.4 * fps);

  for (let frame = 0; frame < totalFrames; frame++) {
    const imageIndex = Math.min(Math.floor(frame / framesPerImage), images.length - 1);
    const frameInImage = frame % framesPerImage;
    const progress = frameInImage / framesPerImage;

    ctx.fillStyle = "#0B0B0B";
    ctx.fillRect(0, 0, width, height);

    drawFrame(images[imageIndex], progress, 1);

    // Crossfade the next image in during the tail of the current one.
    if (frameInImage > framesPerImage - crossfadeFrames && imageIndex + 1 < images.length) {
      const fadeProgress = (frameInImage - (framesPerImage - crossfadeFrames)) / crossfadeFrames;
      drawFrame(images[imageIndex + 1], 0, fadeProgress);
    }

    await new Promise((resolve) => setTimeout(resolve, 1000 / fps));
  }

  recorder.stop();
  const videoBlob = await recordingDone;

  const storagePath = `studios/${studioId}/products/${productDraftId}/video.webm`;
  const storageRef = ref(storage, storagePath);
  await uploadBytes(storageRef, videoBlob, { contentType: "video/webm" });
  return getDownloadURL(storageRef);
}
export async function getCanvasEngineSettings() {
  return getCategoryFrameMap();
}

export async function upsertFramePreset(categorySlug: string, preset: FramePreset) {
  const map = await getCategoryFrameMap();
  map[categorySlug] = preset;
  await updateCategoryFrameMap(map);
}

export async function deleteFramePreset(categorySlug: string) {
  const map = await getCategoryFrameMap();
  delete map[categorySlug];
  await updateCategoryFrameMap(map);
}

export async function updateLuxuryFilterParams(_params: Partial<typeof LUXURY_FILTER_PARAMS>) {
  // Filter params are currently code-level constants; persisted override
  // support can be added to settings/canvasEngineFrames when needed.
}
