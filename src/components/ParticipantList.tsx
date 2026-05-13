import React from 'react';
import { useTranslation } from 'react-i18next';
import { Mic, MicOff, Video, VideoOff, Hand } from 'lucide-react';
import type { Participant } from '../types';

interface ParticipantListProps {
  participants: Participant[];
  currentUserId: string;
}

export const ParticipantList: React.FC<ParticipantListProps> = ({ participants, currentUserId }) => {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col h-full overflow-y-auto p-3">
      <div className="text-xs text-gray-500 uppercase tracking-wider mb-3 px-1">
        {t('meeting.participants', { count: participants.length })}
      </div>
      <div className="space-y-1">
        {participants.map((p) => (
          <div
            key={p.userId}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-800/50 transition-colors"
          >
            {/* Avatar */}
            <div className="w-8 h-8 rounded-full bg-indigo-600/30 flex items-center justify-center shrink-0">
              <span className="text-sm font-bold text-indigo-300">
                {p.userName.charAt(0).toUpperCase()}
              </span>
            </div>

            {/* Name */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-sm text-white truncate">
                  {p.userName}
                </span>
                {p.userId === currentUserId && (
                  <span className="text-xs text-gray-500">{t('common.you')}</span>
                )}
              </div>
            </div>

            {/* Status icons */}
            <div className="flex items-center gap-1.5">
              {p.isHandRaised && <Hand className="w-4 h-4 text-yellow-400" />}
              {p.isMuted ? (
                <MicOff className="w-4 h-4 text-red-400" />
              ) : (
                <Mic className="w-4 h-4 text-gray-400" />
              )}
              {p.isCameraOff ? (
                <VideoOff className="w-4 h-4 text-red-400" />
              ) : (
                <Video className="w-4 h-4 text-gray-400" />
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
