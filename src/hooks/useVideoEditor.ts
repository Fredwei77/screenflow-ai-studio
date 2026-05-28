import { useState, useCallback, useRef, useEffect } from 'react';

interface UseVideoEditorReturn {
  videoElement: HTMLVideoElement | null;
  duration: number;
  currentTime: number;
  isPlaying: boolean;
  trimStart: number;
  trimEnd: number;
  setTrimStart: (time: number) => void;
  setTrimEnd: (time: number) => void;
  play: () => void;
  pause: () => void;
  seek: (time: number) => void;
  loadVideo: (blob: Blob) => void;
  exportVideo: () => Promise<Blob | null>;
  isExporting: boolean;
  exportProgress: number;
}

export const useVideoEditor = (): UseVideoEditorReturn => {
  const [videoElement, setVideoElement] = useState<HTMLVideoElement | null>(null);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(0);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const animFrameRef = useRef<number | null>(null);
  const objectUrlRef = useRef<string | null>(null);

  const loadVideo = useCallback((blob: Blob) => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
    }

    const url = URL.createObjectURL(blob);
    objectUrlRef.current = url;

    const video = document.createElement('video');
    video.src = url;
    video.muted = true;
    video.playsInline = true;

    video.onloadedmetadata = () => {
      setDuration(video.duration);
      setTrimEnd(video.duration);
      setVideoElement(video);
    };
  }, []);

  const updateTime = useCallback(() => {
    if (videoElement) {
      setCurrentTime(videoElement.currentTime);
    }
    animFrameRef.current = requestAnimationFrame(updateTime);
  }, [videoElement]);

  useEffect(() => {
    if (isPlaying && videoElement) {
      animFrameRef.current = requestAnimationFrame(updateTime);
    }
    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [isPlaying, videoElement, updateTime]);

  const play = useCallback(() => {
    if (videoElement) {
      videoElement.play();
      setIsPlaying(true);
    }
  }, [videoElement]);

  const pause = useCallback(() => {
    if (videoElement) {
      videoElement.pause();
      setIsPlaying(false);
    }
  }, [videoElement]);

  const seek = useCallback(
    (time: number) => {
      if (videoElement) {
        videoElement.currentTime = time;
        setCurrentTime(time);
      }
    },
    [videoElement]
  );

  const exportVideo = useCallback(async (): Promise<Blob | null> => {
    if (!videoElement) return null;

    setIsExporting(true);
    setExportProgress(0);

    try {
      const canvas = document.createElement('canvas');
      canvas.width = videoElement.videoWidth;
      canvas.height = videoElement.videoHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;

      const stream = canvas.captureStream(30);
      const recorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp9',
      });

      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      return new Promise<Blob | null>((resolve) => {
        recorder.onstop = () => {
          const blob = new Blob(chunks, { type: 'video/webm' });
          setIsExporting(false);
          setExportProgress(100);
          resolve(blob);
        };

        recorder.start();

        videoElement.currentTime = trimStart;
        videoElement.play();

        const renderFrame = () => {
          if (videoElement.currentTime >= trimEnd || videoElement.paused) {
            recorder.stop();
            videoElement.pause();
            return;
          }

          ctx.drawImage(videoElement, 0, 0);
          const progress = ((videoElement.currentTime - trimStart) / (trimEnd - trimStart)) * 100;
          setExportProgress(progress);

          requestAnimationFrame(renderFrame);
        };

        videoElement.onseeked = () => {
          renderFrame();
        };
      });
    } catch (error) {
      console.error('Export failed:', error);
      setIsExporting(false);
      return null;
    }
  }, [videoElement, trimStart, trimEnd]);

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
      }
    };
  }, []);

  return {
    videoElement,
    duration,
    currentTime,
    isPlaying,
    trimStart,
    trimEnd,
    setTrimStart,
    setTrimEnd,
    play,
    pause,
    seek,
    loadVideo,
    exportVideo,
    isExporting,
    exportProgress,
  };
};
