import React, { useEffect, useRef, useState, useCallback } from 'react';
import { isSafari } from '../utils/browser';

// Global flag: once the user taps "enable audio", all future AudioElements auto-play
let audioUnlocked = false;
const pendingPlaybacks: Array<() => void> = [];

function unlockAllAudio() {
  audioUnlocked = true;
  // Resume AudioContext if suspended
  try {
    const AC = window.AudioContext || (window as any).webkitAudioContext;
    if (AC) {
      const ctx = new AC();
      if (ctx.state === 'suspended') ctx.resume();
      ctx.close();
    }
  } catch { /* ignore */ }
  pendingPlaybacks.forEach(fn => fn());
  pendingPlaybacks.length = 0;
}

interface RemoteAudioPlayerProps {
  streams: Map<string, MediaStream | null>;
}

const AudioElement: React.FC<{ stream: MediaStream; userId: string }> = ({ stream, userId }) => {
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (!audioRef.current) return;
    audioRef.current.srcObject = stream;

    const tryPlay = () => {
      audioRef.current?.play().catch((err) => {
        if (err.name === 'NotAllowedError' && !audioUnlocked) {
          // Safari autoplay blocked — queue for later
          pendingPlaybacks.push(() => {
            audioRef.current?.play().catch(() => {});
          });
        }
      });
    };

    if (audioUnlocked) {
      tryPlay();
    } else {
      // Try anyway (works on non-Safari); if blocked, it's queued above
      tryPlay();
    }
  }, [stream, userId]);

  return (
    <audio
      ref={audioRef}
      autoPlay
      playsInline
      data-user={userId}
      style={{ display: 'none' }}
    />
  );
};

export const RemoteAudioPlayer: React.FC<RemoteAudioPlayerProps> = ({ streams }) => {
  const [needsUnlock, setNeedsUnlock] = useState(false);

  // On Safari, show the unlock overlay if audio hasn't been unlocked yet
  useEffect(() => {
    if (!isSafari || audioUnlocked) return;

    // Check if there are any streams that need playback
    const hasStreams = Array.from(streams.values()).some(
      s => s && s.getAudioTracks().length > 0
    );
    if (hasStreams && !audioUnlocked) {
      setNeedsUnlock(true);
    }
  }, [streams]);

  const handleUnlock = useCallback(() => {
    unlockAllAudio();
    setNeedsUnlock(false);
  }, []);

  return (
    <>
      {Array.from(streams.entries()).map(([userId, stream]) =>
        stream && stream.getAudioTracks().length > 0 ? (
          <AudioElement key={userId} stream={stream} userId={userId} />
        ) : null
      )}
      {needsUnlock && (
        <div
          onClick={handleUnlock}
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm cursor-pointer"
        >
          <div className="bg-gray-800 rounded-2xl px-8 py-6 text-center shadow-2xl border border-gray-700">
            <div className="text-4xl mb-3">🔊</div>
            <p className="text-white text-lg font-medium mb-1">Tap to enable audio</p>
            <p className="text-gray-400 text-sm">Audio playback requires a user interaction on this device</p>
          </div>
        </div>
      )}
    </>
  );
};
