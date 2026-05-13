import { useState, useCallback, useRef, useEffect } from 'react';
import { RecorderState, type MediaSourceType } from '../types';

export function useMediaStream() {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [mediaSource, setMediaSource] = useState<MediaSourceType>('camera');
  const [error, setError] = useState<string | null>(null);
  const recorderStateRef = useRef<RecorderState>(RecorderState.IDLE);

  const setRecorderState = (state: RecorderState) => {
    recorderStateRef.current = state;
  };

  const switchMediaSource = useCallback(
    async (type: MediaSourceType) => {
      try {
        if (stream) {
          stream.getTracks().forEach((track) => track.stop());
        }

        setError(null);
        let newStream: MediaStream;

        const micAudioConstraints: MediaTrackConstraints = {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 48000,
          channelCount: 1,
        };

        if (type === 'screen') {
          const screenStream = await navigator.mediaDevices.getDisplayMedia({
            video: { width: { ideal: 1920 }, height: { ideal: 1080 }, frameRate: { ideal: 30 } },
            audio: false,
          });
          const micStream = await navigator.mediaDevices.getUserMedia({ audio: micAudioConstraints });
          newStream = new MediaStream([
            ...screenStream.getVideoTracks(),
            ...micStream.getAudioTracks(),
          ]);
        } else if (type === 'camera') {
          newStream = await navigator.mediaDevices.getUserMedia({
            video: { width: { ideal: 1920 }, height: { ideal: 1080 }, facingMode: 'user', frameRate: { ideal: 30 } },
            audio: micAudioConstraints,
          });
        } else {
          const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
          const micStream = await navigator.mediaDevices.getUserMedia({ audio: micAudioConstraints });
          newStream = new MediaStream([
            ...screenStream.getVideoTracks(),
            ...micStream.getAudioTracks(),
          ]);
        }

        const tracks = newStream.getTracks();
        if (tracks.length === 0) throw new Error('No tracks in new stream');

        setStream(newStream);
        setMediaSource(type);

        const videoTrack = newStream.getVideoTracks()[0];
        if (videoTrack) {
          videoTrack.onended = () => {
            if (recorderStateRef.current === RecorderState.RECORDING) {
              // Signal that recording should stop (caller handles this)
              window.dispatchEvent(new CustomEvent('media-track-ended'));
            }
          };
        }
      } catch (err: any) {
        const errorMsg =
          err.name === 'NotAllowedError'
            ? 'Permission denied. Please allow camera/microphone access.'
            : err.name === 'NotFoundError'
            ? 'Camera or microphone not found.'
            : `Failed to access media: ${err.message || 'Unknown error'}`;
        setError(errorMsg);
        setStream(null);
        setMediaSource(type);
      }
    },
    [stream]
  );

  const initCamera = useCallback(async () => {
    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1920 }, height: { ideal: 1080 }, facingMode: 'user', frameRate: { ideal: 30 } },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 48000,
          channelCount: 1,
        },
      });
      setStream(newStream);
      setError(null);
    } catch (err: any) {
      const errorMsg =
        err.name === 'NotAllowedError'
          ? 'Camera permission denied. Please allow camera access.'
          : err.name === 'NotFoundError'
          ? 'Camera not found. Please connect a camera.'
          : `Camera error: ${err.message || 'Unknown error'}`;
      setError(errorMsg);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [stream]);

  return {
    stream,
    setStream,
    mediaSource,
    setMediaSource,
    error,
    setError,
    switchMediaSource,
    initCamera,
    setRecorderState,
  };
}
