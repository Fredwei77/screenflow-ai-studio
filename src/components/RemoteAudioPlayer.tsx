import React, { useEffect, useRef } from 'react';

interface RemoteAudioPlayerProps {
  streams: Map<string, MediaStream | null>;
}

const AudioElement: React.FC<{ stream: MediaStream; userId: string }> = ({ stream, userId }) => {
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.srcObject = stream;
    }
  }, [stream]);

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
  return (
    <>
      {Array.from(streams.entries()).map(([userId, stream]) =>
        stream && stream.getAudioTracks().length > 0 ? (
          <AudioElement key={userId} stream={stream} userId={userId} />
        ) : null
      )}
    </>
  );
};
