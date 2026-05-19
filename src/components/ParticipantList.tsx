import React from 'react';
import { useTranslation } from 'react-i18next';
import { Mic, MicOff, Video, VideoOff, Hand, UserX, Shield } from 'lucide-react';
import type { Participant } from '../types';

interface ParticipantListProps {
  participants: Participant[];
  currentUserId: string;
  isHost?: boolean;
  onKick?: (userId: string) => void;
}

export const ParticipantList: React.FC<ParticipantListProps> = ({ participants, currentUserId, isHost, onKick }) => {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col h-full overflow-y-auto p-3">
      <div className="text-xs text-gray-500 uppercase tracking-wider mb-3 px-1">
        {t('meeting.participants', { count: participants.length })}
      </div>
      <div className="space-y-1">
        {participants.map((p) => {
          const isParticipantHost = p.role && ['TEACHER', 'ADMIN', 'TA'].includes(p.role);
          return (
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
                  {isParticipantHost && (
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-indigo-600/30 text-indigo-300">
                      <Shield className="w-2.5 h-2.5" />
                      {t('permissions.role.host')}
                    </span>
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
                {/* Kick button - only visible to host, can't kick self */}
                {isHost && p.userId !== currentUserId && onKick && (
                  <button
                    onClick={() => onKick(p.userId)}
                    className="p-1 rounded hover:bg-red-600/20 text-gray-500 hover:text-red-400 transition-colors"
                    title={t('permissions.kick')}
                  >
                    <UserX className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
