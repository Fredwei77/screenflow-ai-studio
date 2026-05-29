import { useEffect, useRef, useState } from 'react';
import type { BlurRegion } from '../components/BlurOverlay';

interface PrivacyBlurState {
  outputStream: MediaStream | null;
  isProcessing: boolean;
}

export const usePrivacyBlur = (
  sourceStream: MediaStream | null,
  regions: BlurRegion[],
  audioSourceStream?: MediaStream | null,
  fps = 25
): PrivacyBlurState => {
  const [outputStream, setOutputStream] = useState<MediaStream | null>(null);
  const regionsRef = useRef(regions);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    regionsRef.current = regions;
  }, [regions]);

  useEffect(() => {
    if (!sourceStream || regions.length === 0) {
      setOutputStream(null);
      return;
    }

    const videoTrack = sourceStream.getVideoTracks()[0];
    if (!videoTrack) {
      setOutputStream(null);
      return;
    }

    const settings = videoTrack.getSettings();
    const canvas = document.createElement('canvas');
    canvas.width = settings.width || 1280;
    canvas.height = settings.height || 720;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      setOutputStream(null);
      return;
    }

    const video = document.createElement('video');
    video.srcObject = sourceStream;
    video.muted = true;
    video.playsInline = true;
    video.play().catch(() => {});

    const blurredStream = canvas.captureStream(fps);
    const audioStream = audioSourceStream ?? sourceStream;
    audioStream.getAudioTracks().forEach((track) => {
      blurredStream.addTrack(track);
    });
    setOutputStream(blurredStream);

    const draw = () => {
      if (video.readyState >= 2) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.filter = 'none';
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        regionsRef.current.forEach((region) => {
          const x = Math.max(0, region.x * canvas.width);
          const y = Math.max(0, region.y * canvas.height);
          const width = Math.min(region.width * canvas.width, canvas.width - x);
          const height = Math.min(region.height * canvas.height, canvas.height - y);
          if (width <= 0 || height <= 0) return;

          ctx.save();
          ctx.beginPath();
          ctx.rect(x, y, width, height);
          ctx.clip();
          ctx.filter = `blur(${region.intensity}px)`;
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          ctx.filter = 'none';
          ctx.fillStyle = 'rgba(15, 23, 42, 0.12)';
          ctx.fillRect(x, y, width, height);
          ctx.restore();
        });
      }

      frameRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      blurredStream.getVideoTracks().forEach((track) => track.stop());
      video.srcObject = null;
    };
  }, [audioSourceStream, fps, regions.length, sourceStream]);

  return {
    outputStream,
    isProcessing: !!outputStream,
  };
};
