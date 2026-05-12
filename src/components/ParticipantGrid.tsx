import React from 'react';
import { Mic, MicOff, VideoOff, Hand } from 'lucide-react';

interface ParticipantView {
  userId: string;
  name: string;
  stream?: MediaStream;
  isMuted?: boolean;
  isCameraOff?: boolean;
  isHandRaised?: boolean;
  isLocal?: boolean;
}

interface ParticipantGridProps {
  participants: ParticipantView[];
}

const VideoTile: React.FC<{ participant: ParticipantView }> = ({ participant }) => {
  const videoRef = React.useRef<HTMLVideoElement>(null);

  React.useEffect(() => {
    if (videoRef.current && participant.stream) {
      videoRef.current.srcObject = participant.stream;
    }
  }, [participant.stream]);

  return (
    <div className="relative rounded-xl overflow-hidden bg-gray-800 border border-gray-700 aspect-video">
      {participant.stream && !participant.isCameraOff ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={participant.isLocal}
          className={`w-full h-full object-cover ${participant.isLocal ? 'scale-x-[-1]' : ''}`}
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
            {participant.name} {participant.isLocal && '(You)'}
          </span>
          <div className="flex items-center gap-1 sm:gap-2">
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
      {participant.isCameraOff && (
        <div className="absolute top-2 right-2">
          <VideoOff className="w-4 h-4 text-gray-400" />
        </div>
      )}
    </div>
  );
};

export const ParticipantGrid: React.FC<ParticipantGridProps> = ({ participants }) => {
  const count = participants.length;

  const gridClass =
    count <= 1
      ? 'grid-cols-1 max-w-2xl mx-auto'
      : count === 2
      ? 'grid-cols-1 sm:grid-cols-2'
      : count <= 4
      ? 'grid-cols-2'
      : 'grid-cols-2 lg:grid-cols-3';

  return (
    <div className={`grid ${gridClass} gap-2 sm:gap-4 h-full content-center`}>
      {participants.map((p) => (
        <VideoTile key={p.userId} participant={p} />
      ))}
    </div>
  );
};
