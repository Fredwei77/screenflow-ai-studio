import { useEffect, useRef, useState } from 'react';
import type { BackgroundMode } from '../stores/useMeetingStore';
import { supportsCaptureStream } from '../utils/browser';

interface VirtualBackgroundOptions {
  mode: BackgroundMode;
  color?: string;
  imageUrl?: string;
  blurRadius?: number;
}

export function useVirtualBackground(
  rawStream: MediaStream | null,
  options: VirtualBackgroundOptions
): MediaStream | null {
  const [processedStream, setProcessedStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number>(0);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const imageLoadedRef = useRef(false);
  const outputStreamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (!rawStream || options.mode === 'none') {
      setProcessedStream(null);
      return;
    }

    // iOS Safari does not support canvas.captureStream()
    if (!supportsCaptureStream) {
      setProcessedStream(null);
      return;
    }

    const videoTrack = rawStream.getVideoTracks()[0];
    if (!videoTrack) {
      setProcessedStream(null);
      return;
    }

    const video = document.createElement('video');
    video.srcObject = new MediaStream([videoTrack]);
    video.muted = true;
    video.playsInline = true;
    video.autoplay = true;
    videoRef.current = video;

    const canvas = document.createElement('canvas');
    canvas.width = 1280;
    canvas.height = 720;
    canvasRef.current = canvas;

    const ctx = canvas.getContext('2d')!;
    imageLoadedRef.current = false;
    let stopped = false;

    if (options.mode === 'image' && options.imageUrl) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        imageRef.current = img;
        imageLoadedRef.current = true;
      };
      img.onerror = () => {
        imageRef.current = null;
        imageLoadedRef.current = true;
      };
      img.src = options.imageUrl;
    }

    video.play().catch(() => {});

    const processFrame = () => {
      if (stopped || !videoRef.current || !canvasRef.current) return;

      const v = videoRef.current;
      const c = canvasRef.current;
      const context = c.getContext('2d')!;
      const w = c.width;
      const h = c.height;

      if (v.readyState < 2) {
        animFrameRef.current = requestAnimationFrame(processFrame);
        return;
      }

      switch (options.mode) {
        case 'blur': {
          const blurRadius = options.blurRadius || 12;
          context.filter = `blur(${blurRadius}px)`;
          context.drawImage(v, 0, 0, w, h);
          context.filter = 'none';

          const centerX = w / 2;
          const centerY = h / 2;
          const radius = Math.min(w, h) * 0.4;

          context.save();
          context.beginPath();
          context.arc(centerX, centerY, radius, 0, Math.PI * 2);
          context.clip();
          context.drawImage(v, 0, 0, w, h);
          context.restore();

          const gradient = context.createRadialGradient(
            centerX, centerY, radius * 0.8,
            centerX, centerY, radius
          );
          gradient.addColorStop(0, 'rgba(0,0,0,0)');
          gradient.addColorStop(1, 'rgba(0,0,0,0.3)');
          context.fillStyle = gradient;
          context.fillRect(0, 0, w, h);
          break;
        }
        case 'solid': {
          context.fillStyle = options.color || '#1e293b';
          context.fillRect(0, 0, w, h);
          const pad = Math.min(w, h) * 0.1;
          const vidW = w - pad * 2;
          const vidH = h - pad * 2;
          context.drawImage(v, pad, pad, vidW, vidH);
          break;
        }
        case 'image': {
          if (imageLoadedRef.current && imageRef.current) {
            const img = imageRef.current;
            const imgRatio = img.width / img.height;
            const canvasRatio = w / h;
            let drawW: number, drawH: number, drawX: number, drawY: number;

            if (imgRatio > canvasRatio) {
              drawH = h;
              drawW = h * imgRatio;
              drawX = (w - drawW) / 2;
              drawY = 0;
            } else {
              drawW = w;
              drawH = w / imgRatio;
              drawX = 0;
              drawY = (h - drawH) / 2;
            }

            context.drawImage(img, drawX, drawY, drawW, drawH);
          } else {
            context.fillStyle = '#1e293b';
            context.fillRect(0, 0, w, h);
          }
          const imgPad = Math.min(w, h) * 0.1;
          const imgVidW = w - imgPad * 2;
          const imgVidH = h - imgPad * 2;
          context.drawImage(v, imgPad, imgPad, imgVidW, imgVidH);
          break;
        }
        default:
          context.drawImage(v, 0, 0, w, h);
      }

      animFrameRef.current = requestAnimationFrame(processFrame);
    };

    video.onloadeddata = () => {
      canvas.width = video.videoWidth || 1280;
      canvas.height = video.videoHeight || 720;
      animFrameRef.current = requestAnimationFrame(processFrame);
    };

    const outputStream = canvas.captureStream(30);
    const audioTracks = rawStream.getAudioTracks();
    audioTracks.forEach((track) => outputStream.addTrack(track));
    outputStreamRef.current = outputStream;

    setProcessedStream(outputStream);

    return () => {
      stopped = true;
      cancelAnimationFrame(animFrameRef.current);
      if (videoRef.current) {
        videoRef.current.srcObject = null;
        videoRef.current = null;
      }
      canvasRef.current = null;
      imageRef.current = null;
      if (outputStreamRef.current) {
        outputStreamRef.current.getTracks().forEach((t) => t.stop());
        outputStreamRef.current = null;
      }
    };
  }, [rawStream, options.mode, options.color, options.imageUrl, options.blurRadius]);

  return processedStream;
}