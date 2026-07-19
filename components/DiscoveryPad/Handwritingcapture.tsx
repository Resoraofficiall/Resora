'use client';

import { useRef, useState, useCallback } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebaseClient';
import { findActiveApprovedStudioByName } from '@/services/studioService';

// ---------------------------------------------------------------------------
// RSR-CMP-011 — components/DiscoveryPad/HandwritingCapture.tsx
// Blueprint §30.5 (Mode 1). Finger-drawn handwriting capture on the
// Discovery Pad, feeding a handwriting-recognition step. No keyboard input
// ever appears — there is deliberately no <input type="text"> in this file.
//
// Recognition choice (documented per Phase 3.5 Step 2's requirement to pick
// one and not silently fall back to typed input): a Cloud Function
// (`recognizeHandwriting`) receives the captured stroke path as normalized
// point arrays and calls a handwriting-recognition API server-side, keeping
// any third-party API key off the client. This function does NOT fall back
// to a text input under any circumstance — if recognition fails, the user
// simply redraws.
// ---------------------------------------------------------------------------

interface Stroke {
  points: { x: number; y: number; t: number }[];
}

interface HandwritingCaptureProps {
  onMatch: (slug: string) => void;
  onNoMatch: () => void;
}

const recognizeHandwriting = httpsCallable<{ strokes: Stroke[] }, { text: string | null }>(
  functions,
  'recognizeHandwriting'
);

export function HandwritingCapture({ onMatch, onNoMatch }: HandwritingCaptureProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const strokesRef = useRef<Stroke[]>([]);
  const currentStrokeRef = useRef<Stroke | null>(null);
  const idleTimerRef = useRef<number | null>(null);
  const [recognizing, setRecognizing] = useState(false);

  const getCtx = () => canvasRef.current?.getContext('2d') ?? null;

  const startStroke = useCallback((x: number, y: number) => {
    const stroke: Stroke = { points: [{ x, y, t: performance.now() }] };
    currentStrokeRef.current = stroke;
    const ctx = getCtx();
    if (ctx) {
      ctx.strokeStyle = '#C8A96A';
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x, y);
    }
  }, []);

  const extendStroke = useCallback((x: number, y: number) => {
    const stroke = currentStrokeRef.current;
    if (!stroke) return;
    stroke.points.push({ x, y, t: performance.now() });
    const ctx = getCtx();
    if (ctx) {
      ctx.lineTo(x, y);
      ctx.stroke();
    }
  }, []);

  const scheduleRecognition = useCallback(() => {
    if (idleTimerRef.current) window.clearTimeout(idleTimerRef.current);
    // A brief pause after the last stroke is the trigger — this is a
    // drawing surface, not a live-recognition-per-frame system.
    idleTimerRef.current = window.setTimeout(runRecognition, 900);
  }, []);

  const endStroke = useCallback(() => {
    if (currentStrokeRef.current) {
      strokesRef.current.push(currentStrokeRef.current);
      currentStrokeRef.current = null;
    }
    scheduleRecognition();
  }, [scheduleRecognition]);

  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = getCtx();
    if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    strokesRef.current = [];
  }, []);

  const runRecognition = useCallback(async () => {
    if (strokesRef.current.length === 0) return;
    setRecognizing(true);
    try {
      const result = await recognizeHandwriting({ strokes: strokesRef.current });
      const text = result.data.text?.trim();
      if (!text) {
        onNoMatch();
        clearCanvas();
        return;
      }
      // Recognized text is matched only against status: "active" &&
      // approved: true studios — never pending or rejected applications.
      const studio = await findActiveApprovedStudioByName(text);
      if (studio) {
        onMatch(studio.slug);
      } else {
        onNoMatch();
      }
    } catch {
      onNoMatch();
    } finally {
      setRecognizing(false);
      clearCanvas();
    }
  }, [onMatch, onNoMatch, clearCanvas]);

  const toLocal = (canvas: HTMLCanvasElement, clientX: number, clientY: number) => {
    const rect = canvas.getBoundingClientRect();
    return { x: clientX - rect.left, y: clientY - rect.top };
  };

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-4 rounded-[var(--radius-lg)]"
      style={{ touchAction: 'none', cursor: recognizing ? 'wait' : 'crosshair' }}
      onPointerDown={(e) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const { x, y } = toLocal(canvas, e.clientX, e.clientY);
        startStroke(x, y);
      }}
      onPointerMove={(e) => {
        if (e.buttons !== 1) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const { x, y } = toLocal(canvas, e.clientX, e.clientY);
        extendStroke(x, y);
      }}
      onPointerUp={endStroke}
      onPointerLeave={endStroke}
      aria-label="Draw a Studio name with your finger"
    />
  );
}
