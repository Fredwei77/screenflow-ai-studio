import React from 'react';
import { useTranslation } from 'react-i18next';
import { Mic, MicOff, VideoOff, MonitorUp, Hand } from 'lucide-react';

interface ParticipantView {
  userId: string;
  name: string;
  stream?: MediaStream;
  isMuted?: boolean;
  isCameraOff?: boolean;
  isScreenSharing?: boolean;
  isHandRaised?: boolean;
  isLocal?: boolean;
}

interface ParticipantGridProps {
  participants: ParticipantView[];
}

const VideoTile: React.FC<{ participant: ParticipantView }> = ({ participant }) => {
  const { t } = useTranslation();
  const videoRef = React.useRef<HTMLVideoElement>(null);

  React.useEffect(() => {
    const video = videoRef.current;
    if (!video || !participant.stream) return;

    video.srcObject = participant.stream;

    if (!participant.isCameraOff || participant.isScreenSharing) {
      // On iOS Safari, play() may reject with NotAllowedError for unmuted video
      // without a prior user gesture. Since our <video> is muted, it should autoplay.
      // Retry a few times in case the stream isn't ready yet.
      let cancelled = false;
      const attemptPlay = (retries = 3) => {
        if (cancelled) return;
        video.play().catch((err) => {
          if (cancelled) return;
          if (err.name === 'NotAllowedError') {
            // Safari autoplay policy — will resume on next user interaction.
            // Don't retry, it won't help without a gesture.
            console.warn('[VideoTile] autoplay blocked (no user gesture), will play on interaction');
            return;
          }
          if (retries > 0) {
            setTimeout(() => attemptPlay(retries - 1), 500);
          }
        });
      };
      attemptPlay();
      return () => { cancelled = true; };
    }
  }, [participant.stream, participant.isCameraOff, participant.isScreenSharing]);

  const showVideo = participant.stream && (!participant.isCameraOff || participant.isScreenSharing);

  return (
    <div className="relative rounded-xl overflow-hidden bg-gray-800 border border-gray-700 h-full">
      {showVideo ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`w-full h-full object-cover ${participant.isLocal && !participant.isScreenSharing ? 'scale-x-[-1]' : ''}`}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-gray-800">
          <div className="w-16 h-16 rounded-full bg-indigo-600/30 flex items-center justify-center">
            <span className="text-2xl font-bold text-indigo-300">
              {participant.name.charAt(0).toUpperCase()}
            </span>
          </div>
        </div>
      )}

      {/* Name + Status Overlay */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2 sm:p-3">
        <div className="flex items-center justify-between">
          <span className="text-white text-xs sm:text-sm font-medium truncate">
            {participant.name} {participant.isLocal && t('common.you')}
          </span>
          <div className="flex items-center gap-1 sm:gap-2">
            {participant.isScreenSharing && <MonitorUp className="w-3 h-3 sm:w-4 sm:h-4 text-blue-400" />}
            {participant.isHandRaised && <Hand className="w-3 h-3 sm:w-4 sm:h-4 text-yellow-400" />}
            {participant.isMuted ? (
              <MicOff className="w-3 h-3 sm:w-4 sm:h-4 text-red-400" />
            ) : (
              <Mic className="w-3 h-3 sm:w-4 sm:h-4 text-green-400" />
            )}
          </div>
        </div>
      </div>

      {/* Camera off overlay */}
      {participant.isCameraOff && !participant.isScreenSharing && (
        <div className="absolute top-2 right-2">
          <VideoOff className="w-4 h-4 text-gray-400" />
        </div>
      )}
    </div>
  );
};

export const ParticipantGrid: React.FC<ParticipantGridProps> = ({ participants }) => {
  const count = participants.length;

  const containerClass =
    count <= 1
      ? 'max-w-2xl mx-auto'
      : '';

  const gridColsClass =
    count <= 1
      ? 'grid-cols-1'
      : count === 2
      ? 'grid-cols-1 sm:grid-cols-2'
      : count <= 4
      ? 'grid-cols-2'
      : count <= 6
      ? 'grid-cols-2 sm:grid-cols-3'
      : count <= 9
      ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4'
      : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5';

  return (
    <div className={`h-full ${containerClass}`}>
      <div
        className={`grid ${gridColsClass} gap-2 sm:gap-4 h-full`}
        style={{ gridAutoRows: '1fr' }}
      >
        {participants.map((p) => (
          <VideoTile key={p.userId} participant={p} />
        ))}
      </div>
    </div>
  );
};
