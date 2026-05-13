import React, { useMemo } from 'react';
import { useSubtitleStore, MAX_VISIBLE_SUBTITLES } from '../stores/useSubtitleStore';

interface SubtitleOverlayProps {
  interimTranscript?: string;
}

const MAX_REMOTE_INTERIMS = 3;

export const SubtitleOverlay: React.FC<SubtitleOverlayProps> = ({ interimTranscript }) => {
  const isSubtitleEnabled = useSubtitleStore((s) => s.isSubtitleEnabled);
  const isVisible = useSubtitleStore((s) => s.isVisible);
  const remoteInterims = useSubtitleStore((s) => s.remoteInterims);
  const subtitles = useSubtitleStore((s) => s.subtitles);

  const visibleSubtitles = useMemo(() => {
    const finalSubtitles = subtitles.filter((s) => s.isFinal);
    const visible = finalSubtitles.slice(-MAX_VISIBLE_SUBTITLES);
    const count = visible.length;
    return visible.map((entry, index) => ({
      id: entry.id,
      text: entry.text,
      userName: entry.userName,
      opacity: count <= 1 ? 1.0 : 0.4 + 0.6 * (index / (count - 1)),
    }));
  }, [subtitles]);

  if (!isSubtitleEnabled) return null;

  const remoteInterimEntries = Object.entries(remoteInterims).slice(0, MAX_REMOTE_INTERIMS);

  return (
    <div
      className={`absolute bottom-16 left-0 right-0 flex flex-col items-center pointer-events-none z-10 px-4 transition-opacity duration-700 ${
        isVisible ? 'opacity-100' : 'opacity-0'
      }`}
      role="status"
      aria-live="polite"
    >
      {/* Final subtitle history */}
      <div className="flex flex-col items-center gap-1 mb-1">
        {visibleSubtitles.map((entry) => (
          <div
            key={entry.id}
            style={{ opacity: entry.opacity }}
            className="bg-black/75 backdrop-blur-sm text-white text-sm sm:text-base px-4 py-2 rounded-lg max-w-2xl text-center transition-opacity duration-500"
          >
            <span className="text-gray-400 text-xs mr-2">{entry.userName}:</span>
            {entry.text}
          </div>
        ))}
      </div>

      {/* Remote interim transcripts */}
      {remoteInterimEntries.map(([userId, { text, userName }]) => (
        <div
          key={userId}
          className="bg-black/50 backdrop-blur-sm text-gray-300 text-sm sm:text-base px-4 py-1.5 rounded-lg max-w-2xl text-center italic mb-1"
        >
          <span className="text-gray-400 text-xs mr-2">{userName}:</span>
          {text}
        </div>
      ))}

      {/* Local interim transcript */}
      {interimTranscript && (
        <div className="bg-black/50 backdrop-blur-sm text-gray-300 text-sm sm:text-base px-4 py-1.5 rounded-lg max-w-2xl text-center italic">
          {interimTranscript}
        </div>
      )}
    </div>
  );
};
