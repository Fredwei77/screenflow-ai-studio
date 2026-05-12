import { useState, useRef, useCallback } from 'react';
import { RecorderState } from '../types';
import { config } from '../config';

export function useRecording() {
  const [recorderState, setRecorderState] = useState<RecorderState>(RecorderState.IDLE);
  const [recordedChunks, setRecordedChunks] = useState<Blob[]>([]);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const durationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startRecording = useCallback(
    (stream: MediaStream | null, setError: (e: string | null) => void) => {
      if (!stream) {
        setError('No media stream available. Please allow camera/microphone access.');
        return false;
      }

      const activeTracks = stream.getTracks().filter((t) => t.readyState === 'live');
      if (activeTracks.length === 0) {
        setError('Media stream is not active. Please refresh and allow access.');
        return false;
      }

      setRecordedChunks([]);
      setDownloadUrl(null);
      setRecordingDuration(0);
      setError(null);

      try {
        const mimeTypes = [
          'video/webm;codecs=vp9,opus',
          'video/webm;codecs=vp8,opus',
          'video/webm;codecs=vp9',
          'video/webm;codecs=vp8',
          'video/webm',
        ];

        let mimeType = '';
        for (const type of mimeTypes) {
          if (MediaRecorder.isTypeSupported(type)) {
            mimeType = type;
            break;
          }
        }
        if (!mimeType) throw new Error('No supported video mimeType found');

        const mediaRecorder = new MediaRecorder(stream, { mimeType });

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            setRecordedChunks((prev) => [...prev, event.data]);
          }
        };

        mediaRecorder.onerror = () => {
          setError('Recording error occurred. Please try again.');
          stopRecording();
        };

        mediaRecorder.start(1000);
        mediaRecorderRef.current = mediaRecorder;

        durationIntervalRef.current = setInterval(() => {
          setRecordingDuration((prev) => prev + 1);
        }, 1000);

        setRecorderState(RecorderState.RECORDING);
        return true;
      } catch (e: any) {
        setError(`Failed to start recording: ${e.message || 'Unknown error'}`);
        return false;
      }
    },
    []
  );

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setRecorderState(RecorderState.FINISHED);
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }
  }, []);

  const downloadVideo = useCallback(() => {
    if (recordedChunks.length === 0) return;
    const blob = new Blob(recordedChunks, { type: 'video/webm' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    document.body.appendChild(a);
    a.style.display = 'none';
    a.href = url;
    a.download = `recording-${new Date().toISOString()}.webm`;
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }, [recordedChunks]);

  const createDownloadUrl = useCallback(() => {
    if (recorderState === RecorderState.FINISHED && recordedChunks.length > 0) {
      const blob = new Blob(recordedChunks, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      setDownloadUrl(url);
      return url;
    }
    return null;
  }, [recorderState, recordedChunks]);

  return {
    recorderState,
    setRecorderState,
    recordedChunks,
    downloadUrl,
    recordingDuration,
    setRecordingDuration,
    startRecording,
    stopRecording,
    downloadVideo,
    createDownloadUrl,
  };
}
