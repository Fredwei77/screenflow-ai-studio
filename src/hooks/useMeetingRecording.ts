import { useState, useRef, useCallback, useEffect } from 'react';
import { recordingApi } from '../services/api';

export function useMeetingRecording(meetingId: string, userId: string, userName: string, localStream: MediaStream | null) {
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startTimeRef = useRef<number>(0);

  // Cleanup MediaRecorder on unmount
  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  const startRecording = useCallback(() => {
    if (!localStream || !localStream.active) {
      alert('No active media stream available to record.');
      return;
    }

    try {
      const mimeTypes = [
        'video/webm;codecs=vp9,opus',
        'video/webm;codecs=vp8,opus',
        'video/webm',
      ];

      let mimeType = '';
      for (const type of mimeTypes) {
        if (MediaRecorder.isTypeSupported(type)) {
          mimeType = type;
          break;
        }
      }
      if (!mimeType) throw new Error('No supported recording format found');

      const recorder = new MediaRecorder(localStream, {
        mimeType,
        audioBitsPerSecond: 128000,
        videoBitsPerSecond: 2500000,
      });

      chunksRef.current = [];
      startTimeRef.current = Date.now();

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        const chunks = [...chunksRef.current];
        chunksRef.current = [];

        const blob = new Blob(chunks, { type: recorder.mimeType });
        const duration = Math.round((Date.now() - startTimeRef.current) / 1000);
        const fileName = `recording-${meetingId}-${new Date().toISOString().replace(/[:.]/g, '-')}.webm`;

        // Download the recording
        let url: string | null = null;
        try {
          url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = fileName;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
        } catch (err) {
          console.error('Failed to download recording:', err);
        } finally {
          if (url) URL.revokeObjectURL(url);
        }

        // Save metadata to server
        try {
          await recordingApi.saveRecording(meetingId, {
            userId,
            userName,
            fileName,
            fileSize: blob.size,
            duration,
            mimeType: recorder.mimeType,
          });
        } catch (err) {
          console.error('Failed to save recording metadata:', err);
        }

        setIsRecording(false);
      };

      recorder.start(1000);
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
    } catch (err) {
      console.error('Failed to start recording:', err);
      alert('Failed to start recording.');
    }
  }, [localStream, meetingId, userId, userName]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    // Don't set isRecording(false) here — let onstop handle it to avoid race condition
  }, []);

  return {
    isRecording,
    startRecording,
    stopRecording,
  };
}
