import { useState, useRef, useCallback } from 'react';

export function useAudioLevel() {
  const [audioLevel, setAudioLevel] = useState(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const startVisualization = useCallback((stream: MediaStream) => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 48000 });
      // Safari creates AudioContext in suspended state if not triggered by user gesture
      if (audioContext.state === 'suspended') {
        audioContext.resume();
      }
      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(stream);

      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0.8;

      source.connect(analyser);

      audioContextRef.current = audioContext;
      analyserRef.current = analyser;

      const update = () => {
        if (!analyserRef.current) return;
        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteTimeDomainData(dataArray);
        let max = 0;
        for (let i = 0; i < dataArray.length; i++) {
          const v = Math.abs(dataArray[i] - 128);
          if (v > max) max = v;
        }
        const level = Math.min(100, (max / 128) * 100);
        setAudioLevel((prev) => {
          if (level > prev + 4) return prev + 4;
          if (level < prev - 2) return prev - 2;
          return level;
        });
        animationFrameRef.current = requestAnimationFrame(update);
      };

      update();
    } catch (e) {
      console.error('Failed to setup audio visualization:', e);
    }
  }, []);

  const stopVisualization = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    analyserRef.current = null;
    setAudioLevel(0);
  }, []);

  return { audioLevel, startVisualization, stopVisualization };
}
