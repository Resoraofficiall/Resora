/**
 * RSR-MOD-004 — Photo-to-video assembler (Ken Burns).
 * Blueprint §30.3.1 / §30.9 / Phase 3.5 Step 5: "given 4–5 seller-uploaded
 * stills, produce a short video using pan/zoom (Ken Burns) and crossfade
 * transitions between the existing images only — no new frames invented,
 * no interpolation that fabricates visual content not present in the
 * source photos."
 *
 * 🔒 This module performs video COMPOSITING of existing frames only. It
 * never calls a video-generation model, never interpolates fabricated
 * in-between content, and never fetches or references anything but the
 * seller's own already-uploaded images.
 *
 * Implementation approach: draws each source still into an offscreen
 * canvas per animation frame (computing pan/zoom transform + crossfade
 * alpha deterministically from elapsed time), captures the canvas via
 * MediaRecorder + captureStream, and resolves a Blob of the assembled
 * video. This runs entirely client-side (or in a Node/canvas
 * environment for a Cloud Function equivalent) with no third-party
 * generative API involved.
 */

export interface PhotoToVideoOptions {
  /** 4–5 seller-uploaded still image URLs, in display order */
  imageUrls: string[];
  /** Total duration per still, including its crossfade overlap, in ms */
  durationPerImageMs?: number;
  /** Crossfade overlap duration between consecutive stills, in ms */
  crossfadeMs?: number;
  /** Output canvas size */
  width?: number;
  height?: number;
  /** Ken Burns zoom range, e.g. 1.0 -> 1.12 */
  zoomFrom?: number;
  zoomTo?: number;
  onProgress?: (fractionComplete: number) => void;
}

const DEFAULTS = {
  durationPerImageMs: 2200,
  crossfadeMs: 500,
  width: 1080,
  height: 1350, // 4:5, matches the default luxury frame aspect
  zoomFrom: 1.0,
  zoomTo: 1.12,
} as const;

async function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${url}`));
    img.src = url;
  });
}

/** Cover-fit draw of a still into the target canvas box, centered. */
function drawCoverFit(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  width: number,
  height: number,
  zoom: number,
  alpha: number
): void {
  const sourceAspect = img.naturalWidth / img.naturalHeight;
  const targetAspect = width / height;

  let drawWidth = width * zoom;
  let drawHeight = height * zoom;

  if (sourceAspect > targetAspect) {
    drawHeight = height * zoom;
    drawWidth = drawHeight * sourceAspect;
  } else {
    drawWidth = width * zoom;
    drawHeight = drawWidth / sourceAspect;
  }

  const dx = (width - drawWidth) / 2;
  const dy = (height - drawHeight) / 2;

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.drawImage(img, dx, dy, drawWidth, drawHeight);
  ctx.restore();
}

/**
 * Assembles the pan/zoom/crossfade sequence and returns a video Blob
 * (webm via MediaRecorder). Requires a browser environment
 * (HTMLCanvasElement.captureStream + MediaRecorder); for a server-side
 * Cloud Function equivalent, this same frame-composition logic should be
 * reused against node-canvas + ffmpeg rather than reimplemented — see
 * firebase/functions for that variant when built.
 */
export async function assemblePhotoToVideo(
  options: PhotoToVideoOptions
): Promise<Blob> {
  const {
    imageUrls,
    durationPerImageMs = DEFAULTS.durationPerImageMs,
    crossfadeMs = DEFAULTS.crossfadeMs,
    width = DEFAULTS.width,
    height = DEFAULTS.height,
    zoomFrom = DEFAULTS.zoomFrom,
    zoomTo = DEFAULTS.zoomTo,
    onProgress,
  } = options;

  if (imageUrls.length < 2) {
    throw new Error(
      "assemblePhotoToVideo requires at least 2 source stills (spec calls for 4-5)."
    );
  }

  const images = await Promise.all(imageUrls.map(loadImage));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context unavailable");

  const totalDuration = durationPerImageMs * images.length;
  const stream = (canvas as HTMLCanvasElement & { captureStream: (fps?: number) => MediaStream }).captureStream(30);
  const recorder = new MediaRecorder(stream, { mimeType: "video/webm;codecs=vp9" });

  const chunks: BlobPart[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };

  const recordingDone = new Promise<Blob>((resolve) => {
    recorder.onstop = () => resolve(new Blob(chunks, { type: "video/webm" }));
  });

  recorder.start();

  const startTime = performance.now();

  await new Promise<void>((resolve) => {
    function renderFrame(now: number) {
      const elapsed = now - startTime;

      if (elapsed >= totalDuration) {
        ctx.clearRect(0, 0, width, height);
        const lastImg = images[images.length - 1];
        const zoom = zoomFrom + (zoomTo - zoomFrom); // fully zoomed on last frame
        drawCoverFit(ctx, lastImg, width, height, zoom, 1);
        onProgress?.(1);
        resolve();
        return;
      }

      const currentIndex = Math.min(
        Math.floor(elapsed / durationPerImageMs),
        images.length - 1
      );
      const nextIndex = Math.min(currentIndex + 1, images.length - 1);

      const timeIntoCurrent = elapsed - currentIndex * durationPerImageMs;
      const zoomProgress = Math.min(timeIntoCurrent / durationPerImageMs, 1);
      const zoom = zoomFrom + (zoomTo - zoomFrom) * zoomProgress;

      ctx.clearRect(0, 0, width, height);
      drawCoverFit(ctx, images[currentIndex], width, height, zoom, 1);

      // Crossfade in the next still during the final crossfadeMs of the
      // current still's window — composites only existing frames, per
      // §30.3.1 (no fabricated in-between content).
      const fadeStart = durationPerImageMs - crossfadeMs;
      if (timeIntoCurrent > fadeStart && nextIndex !== currentIndex) {
        const fadeProgress = (timeIntoCurrent - fadeStart) / crossfadeMs;
        drawCoverFit(ctx, images[nextIndex], width, height, zoomFrom, fadeProgress);
      }

      onProgress?.(Math.min(elapsed / totalDuration, 1));
      requestAnimationFrame(renderFrame);
    }

    requestAnimationFrame(renderFrame);
  });

  recorder.stop();
  return recordingDone;
}
