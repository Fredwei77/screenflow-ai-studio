import { useState, useCallback, useRef, useEffect } from 'react';
import { RecorderState, type MediaSourceType } from '../types';

export function useMediaStream() {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [screenCaptureSurface, setScreenCaptureSurface] = useState<string | null>(null);
  const [mediaSource, setMediaSource] = useState<MediaSourceType>('camera');
  const [error, setError] = useState<string | null>(null);
  const recorderStateRef = useRef<RecorderState>(RecorderState.IDLE);

  const setRecorderState = (state: RecorderState) => {
    recorderStateRef.current = state;
  };

  // Clean up a specific stream
  const stopStream = (s: MediaStream | null) => {
    if (s) s.getTracks().forEach((t) => t.stop());
  };

  const requestDisplayStream = async () => {
    const displayStream = await navigator.mediaDevices.getDisplayMedia({
      video: {
        width: { ideal: 1920 },
        height: { ideal: 1080 },
        frameRate: { ideal: 30 },
        displaySurface: 'window',
      },
      audio: false,
      preferCurrentTab: false,
      selfBrowserSurface: 'exclude',
      surfaceSwitching: 'include',
      monitorTypeSurfaces: 'include',
    } as any);

    const displaySurface = displayStream.getVideoTracks()[0]?.getSettings().displaySurface || null;
    setScreenCaptureSurface(displaySurface);
    return displayStream;
  };

  const switchMediaSource = useCallback(
    async (type: MediaSourceType) => {
      try {
        // Stop existing streams
        stopStream(stream);
        stopStream(cameraStream);
        stopStream(screenStream);
        setScreenCaptureSurface(null);

        setError(null);

        const micAudioConstraints: MediaTrackConstraints = {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 48000,
          channelCount: 1,
        };

        if (type === 'screen') {
          const displayStream = await requestDisplayStream();
          const micStream = await navigator.mediaDevices.getUserMedia({ audio: micAudioConstraints });
          const combined = new MediaStream([
            ...displayStream.getVideoTracks(),
            ...micStream.getAudioTracks(),
          ]);
          setStream(combined);
          setCameraStream(null);
          setScreenStream(displayStream);
          setMediaSource(type);
        } else if (type === 'camera') {
          const camStream = await navigator.mediaDevices.getUserMedia({
            video: { width: { ideal: 1920 }, height: { ideal: 1080 }, facingMode: 'user', frameRate: { ideal: 30 } },
            audio: micAudioConstraints,
          });
          setStream(camStream);
          setCameraStream(camStream);
          setScreenStream(null);
          setScreenCaptureSurface(null);
          setMediaSource(type);
        } else {
          // 'both' — screen + mic + camera
          const displayStream = await requestDisplayStream();
          const camStream = await navigator.mediaDevices.getUserMedia({
            video: { width: { ideal: 1920 }, height: { ideal: 1080 }, facingMode: 'user', frameRate: { ideal: 30 } },
            audio: false,
          });
          const micStream = await navigator.mediaDevices.getUserMedia({ audio: micAudioConstraints });
          const combined = new MediaStream([
            ...displayStream.getVideoTracks(),
            ...camStream.getVideoTracks(),
            ...micStream.getAudioTracks(),
          ]);
          setStream(combined);
          setCameraStream(camStream);
          setScreenStream(displayStream);
          setMediaSource(type);
        }

        const tracks = stream?.getTracks() ?? [];
        if (tracks.length === 0) {
          // The new stream was just set; listen for track end on next render
        }

        setError(null);
      } catch (err: any) {
        const errorMsg =
          err.name === 'NotAllowedError'
            ? 'Permission denied. Please allow camera/microphone access.'
            : err.name === 'NotFoundError'
            ? 'Camera or microphone not found.'
            : `Failed to access media: ${err.message || 'Unknown error'}`;
        setError(errorMsg);
        setStream(null);
        setCameraStream(null);
        setScreenStream(null);
        setScreenCaptureSurface(null);
        setMediaSource(type);
      }
    },
    [stream, cameraStream, screenStream]
  );

  const initCamera = useCallback(async () => {
    try {
      const camStream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1920 }, height: { ideal: 1080 }, facingMode: 'user', frameRate: { ideal: 30 } },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 48000,
          channelCount: 1,
        },
      });
      setStream(camStream);
      setCameraStream(camStream);
      setScreenStream(null);
      setScreenCaptureSurface(null);
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

  // Listen for track end events
  useEffect(() => {
    if (!stream) return;

    const handleTrackEnded = () => {
      if (recorderStateRef.current === RecorderState.RECORDING) {
        window.dispatchEvent(new CustomEvent('media-track-ended'));
      }
    };

    stream.getVideoTracks().forEach((track) => {
      track.addEventListener('ended', handleTrackEnded);
    });

    return () => {
      stream.getVideoTracks().forEach((track) => {
        track.removeEventListener('ended', handleTrackEnded);
      });
    };
  }, [stream]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopStream(stream);
      // Don't double-stop camera/screen if they're the same object as stream
      if (cameraStream && cameraStream !== stream) stopStream(cameraStream);
      if (screenStream && screenStream !== stream) stopStream(screenStream);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    stream,
    setStream,
    cameraStream,
    screenStream,
    screenCaptureSurface,
    mediaSource,
    setMediaSource,
    error,
    setError,
    switchMediaSource,
    initCamera,
    setRecorderState,
  };
}
