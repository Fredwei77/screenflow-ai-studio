import { useState, useCallback, useRef, useEffect } from 'react';

interface UseTeleprompterReturn {
  script: string;
  sentences: string[];
  currentIndex: number;
  isPlaying: boolean;
  isPaused: boolean;
  isVisible: boolean;
  fontSize: number;
  speed: number;
  setScript: (script: string) => void;
  start: () => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  setFontSize: (size: number) => void;
  setSpeed: (speed: number) => void;
  toggleVisibility: () => void;
  reset: () => void;
}

export const useTeleprompter = (): UseTeleprompterReturn => {
  const [script, setScript] = useState('');
  const [sentences, setSentences] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [fontSize, setFontSize] = useState(24);
  const [speed, setSpeed] = useState(50);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Split script into sentences
  useEffect(() => {
    if (script.trim()) {
      const lines = script
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length > 0);
      setSentences(lines);
    } else {
      setSentences([]);
    }
  }, [script]);

  // Auto-advance to next sentence
  useEffect(() => {
    if (isPlaying && !isPaused && currentIndex < sentences.length) {
      const interval = Math.max(1000, 60000 / speed);
      timerRef.current = setTimeout(() => {
        if (currentIndex < sentences.length - 1) {
          setCurrentIndex((prev) => prev + 1);
        } else {
          setIsPlaying(false);
          setIsPaused(false);
        }
      }, interval);

      return () => {
        if (timerRef.current) clearTimeout(timerRef.current);
      };
    }
  }, [isPlaying, isPaused, currentIndex, sentences.length, speed]);

  const start = useCallback(() => {
    if (sentences.length === 0) return;
    setCurrentIndex(0);
    setIsPlaying(true);
    setIsPaused(false);
    setIsVisible(true);
  }, [sentences.length]);

  const pause = useCallback(() => {
    setIsPaused(true);
  }, []);

  const resume = useCallback(() => {
    setIsPaused(false);
  }, []);

  const stop = useCallback(() => {
    setIsPlaying(false);
    setIsPaused(false);
    setCurrentIndex(0);
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  const toggleVisibility = useCallback(() => {
    setIsVisible((prev) => !prev);
  }, []);

  const reset = useCallback(() => {
    setScript('');
    setSentences([]);
    setCurrentIndex(0);
    setIsPlaying(false);
    setIsPaused(false);
    setIsVisible(false);
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  return {
    script,
    sentences,
    currentIndex,
    isPlaying,
    isPaused,
    isVisible,
    fontSize,
    speed,
    setScript,
    start,
    pause,
    resume,
    stop,
    setFontSize,
    setSpeed,
    toggleVisibility,
    reset,
  };
};
