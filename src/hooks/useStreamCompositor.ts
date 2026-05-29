import { useState, useEffect, useRef, useCallback } from 'react';

export type LayoutMode = 'camera-only' | 'screen-only' | 'pip' | 'side-by-side' | 'floating-camera';

export interface PiPPosition {
  x: number;
  y: number;
}

interface CompositorState {
  isCompositing: boolean;
  canvasWidth: number;
  canvasHeight: number;
}

interface UseStreamCompositorReturn {
  outputStream: MediaStream | null;
  compositorState: CompositorState;
}

const drawVideoCover = (
  ctx: CanvasRenderingContext2D,
  video: HTMLVideoElement,
  x: number,
  y: number,
  width: number,
  height: number
) => {
  const sourceWidth = video.videoWidth || width;
  const sourceHeight = video.videoHeight || height;
  const sourceRatio = sourceWidth / sourceHeight;
  const targetRatio = width / height;
  let sx = 0;
  let sy = 0;
  let sw = sourceWidth;
  let sh = sourceHeight;

  if (sourceRatio > targetRatio) {
    sw = sourceHeight * targetRatio;
    sx = (sourceWidth - sw) / 2;
  } else {
    sh = sourceWidth / targetRatio;
    sy = (sourceHeight - sh) / 2;
  }

  ctx.drawImage(video, sx, sy, sw, sh, x, y, width, height);
};

export const useStreamCompositor = (
  cameraStream: MediaStream | null,
  screenStream: MediaStream | null,
  layoutMode: LayoutMode,
  pipPosition: PiPPosition,
  fps?: number,
  sideBySideRatio?: number,
  presenterScale = 1
): UseStreamCompositorReturn => {
  const [outputStream, setOutputStream] = useState<MediaStream | null>(null);
  const [compositorState, setCompositorState] = useState<CompositorState>({
    isCompositing: false,
    canvasWidth: 1920,
    canvasHeight: 1080,
  });

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const cameraVideoRef = useRef<HTMLVideoElement | null>(null);
  const screenVideoRef = useRef<HTMLVideoElement | null>(null);

  // Create hidden video elements
  useEffect(() => {
    if (cameraStream) {
      const video = document.createElement('video');
      video.srcObject = cameraStream;
      video.muted = true;
      video.playsInline = true;
      video.play().catch(() => {});
      cameraVideoRef.current = video;
    } else {
      cameraVideoRef.current = null;
    }
  }, [cameraStream]);

  useEffect(() => {
    if (screenStream) {
      const video = document.createElement('video');
      video.srcObject = screenStream;
      video.muted = true;
      video.playsInline = true;
      video.play().catch(() => {});
      screenVideoRef.current = video;
    } else {
      screenVideoRef.current = null;
    }
  }, [screenStream]);

  // Determine if compositing is needed
  const needsCompositing =
    (layoutMode === 'pip' || layoutMode === 'side-by-side' || layoutMode === 'floating-camera') &&
    cameraStream &&
    screenStream;

  // Setup canvas and compositing
  useEffect(() => {
    if (!needsCompositing) {
      setOutputStream(null);
      setCompositorState({ isCompositing: false, canvasWidth: 1920, canvasHeight: 1080 });
      return;
    }

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) return;

    canvasRef.current = canvas;
    ctxRef.current = ctx;

    // Set canvas size based on screen stream
    const screenTrack = screenStream?.getVideoTracks()[0];
    const settings = screenTrack?.getSettings();
    const width = settings?.width || 1920;
    const height = settings?.height || 1080;

    canvas.width = width;
    canvas.height = height;

    setCompositorState({ isCompositing: true, canvasWidth: width, canvasHeight: height });

    const captureStream = canvas.captureStream(fps || 25);
    setOutputStream(captureStream);

    // Render loop
    const render = () => {
      if (!ctx || !canvas) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw screen
      if (screenVideoRef.current && screenVideoRef.current.readyState >= 2) {
        ctx.drawImage(screenVideoRef.current, 0, 0, canvas.width, canvas.height);
      }

      // Draw camera
      if (cameraVideoRef.current && cameraVideoRef.current.readyState >= 2) {
        const ratio = sideBySideRatio || 0.35;

        switch (layoutMode) {
          case 'pip': {
            const pipW = canvas.width * 0.22 * presenterScale;
            const pipH = canvas.height * 0.22 * presenterScale;
            const pipX = canvas.width - pipW - pipPosition.x;
            const pipY = canvas.height - pipH - pipPosition.y;
            ctx.save();
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.beginPath();
            ctx.roundRect(pipX, pipY, pipW, pipH, 12);
            ctx.clip();
            drawVideoCover(ctx, cameraVideoRef.current, pipX, pipY, pipW, pipH);
            ctx.restore();
            ctx.strokeStyle = 'rgba(6, 182, 212, 0.8)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.roundRect(pipX, pipY, pipW, pipH, 12);
            ctx.stroke();
            break;
          }
          case 'side-by-side': {
            const camW = canvas.width * ratio;
            const screenW = canvas.width * (1 - ratio);
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            drawVideoCover(ctx, cameraVideoRef.current, 0, 0, camW, canvas.height);
            if (screenVideoRef.current && screenVideoRef.current.readyState >= 2) {
              ctx.drawImage(screenVideoRef.current, camW, 0, screenW, canvas.height);
            }
            break;
          }
          case 'floating-camera': {
            const r = Math.min(canvas.width, canvas.height) * 0.08 * presenterScale;
            const cx = canvas.width - r - pipPosition.x - 20;
            const cy = canvas.height - r - pipPosition.y - 20;
            ctx.save();
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.beginPath();
            ctx.arc(cx, cy, r, 0, Math.PI * 2);
            ctx.clip();
            drawVideoCover(ctx, cameraVideoRef.current, cx - r, cy - r, r * 2, r * 2);
            ctx.restore();
            ctx.strokeStyle = 'rgba(6, 182, 212, 0.8)';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(cx, cy, r, 0, Math.PI * 2);
            ctx.stroke();
            break;
          }
        }
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [needsCompositing, screenStream, cameraStream, layoutMode, pipPosition, fps, sideBySideRatio, presenterScale]);

  return { outputStream, compositorState };
};
