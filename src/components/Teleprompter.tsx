import React from 'react';
import { ChevronUp, ChevronDown, Play, Pause, Square, Eye, EyeOff } from 'lucide-react';

interface TeleprompterProps {
  sentences: string[];
  currentIndex: number;
  isPlaying: boolean;
  isPaused: boolean;
  fontSize: number;
  speed: number;
  isVisible: boolean;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  onFontSizeChange: (size: number) => void;
  onSpeedChange: (speed: number) => void;
  onToggleVisibility: () => void;
}

export const Teleprompter: React.FC<TeleprompterProps> = ({
  sentences,
  currentIndex,
  isPlaying,
  isPaused,
  fontSize,
  speed,
  isVisible,
  onStart,
  onPause,
  onResume,
  onStop,
  onFontSizeChange,
  onSpeedChange,
  onToggleVisibility,
}) => {
  if (!isVisible || sentences.length === 0) return null;

  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 w-[80%] max-w-3xl z-30 pointer-events-auto">
      <div className="bg-black/70 backdrop-blur-md rounded-xl border border-white/10 p-4">
        {/* Controls */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {!isPlaying ? (
              <button
                onClick={onStart}
                className="p-1.5 bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
                title="Start"
              >
                <Play className="w-4 h-4 text-white" />
              </button>
            ) : isPaused ? (
              <button
                onClick={onResume}
                className="p-1.5 bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
                title="Resume"
              >
                <Play className="w-4 h-4 text-white" />
              </button>
            ) : (
              <button
                onClick={onPause}
                className="p-1.5 bg-yellow-600 hover:bg-yellow-700 rounded-lg transition-colors"
                title="Pause"
              >
                <Pause className="w-4 h-4 text-white" />
              </button>
            )}
            <button
              onClick={onStop}
              className="p-1.5 bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
              title="Stop"
            >
              <Square className="w-4 h-4 text-white" />
            </button>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <button
                onClick={() => onFontSizeChange(Math.max(16, fontSize - 2))}
                className="p-1 text-gray-400 hover:text-white"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
              <span className="text-xs text-gray-400 w-8 text-center">{fontSize}px</span>
              <button
                onClick={() => onFontSizeChange(Math.min(48, fontSize + 2))}
                className="p-1 text-gray-400 hover:text-white"
              >
                <ChevronUp className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center gap-1">
              <span className="text-xs text-gray-400">Speed:</span>
              <input
                type="range"
                min={10}
                max={100}
                value={speed}
                onChange={(e) => onSpeedChange(Number(e.target.value))}
                className="w-16 h-1 accent-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* Script Display */}
        <div
          className="overflow-hidden"
          style={{ maxHeight: `${fontSize * 3 + 16}px` }}
        >
          <div
            className="transition-transform duration-300 ease-out"
            style={{
              transform: `translateY(-${currentIndex * (fontSize + 8)}px)`,
            }}
          >
            {sentences.map((sentence, index) => (
              <p
                key={index}
                className="py-1 transition-all duration-200"
                style={{
                  fontSize: `${fontSize}px`,
                  color:
                    index === currentIndex
                      ? '#ffffff'
                      : index < currentIndex
                      ? '#6b7280'
                      : '#9ca3af',
                  opacity: index === currentIndex ? 1 : 0.6,
                  fontWeight: index === currentIndex ? 'bold' : 'normal',
                }}
              >
                {sentence}
              </p>
            ))}
          </div>
        </div>

        {/* Progress */}
        <div className="mt-2 flex items-center justify-between text-xs text-gray-400">
          <span>
            {currentIndex + 1} / {sentences.length}
          </span>
          <span>{Math.round(((currentIndex + 1) / sentences.length) * 100)}%</span>
        </div>
      </div>
    </div>
  );
};

export default Teleprompter;
