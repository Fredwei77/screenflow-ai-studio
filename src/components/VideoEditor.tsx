import React, { useEffect, useRef, useCallback } from 'react';
import { X, Play, Pause, Download, Scissors, Loader2 } from 'lucide-react';
import { useVideoEditor } from '../hooks/useVideoEditor';

interface VideoEditorProps {
  isOpen: boolean;
  onClose: () => void;
  sourceBlob: Blob | null;
  fullSessionText?: string;
  subtitleLanguage?: string;
  theme: 'dark' | 'light';
}

export const VideoEditor: React.FC<VideoEditorProps> = ({
  isOpen,
  onClose,
  sourceBlob,
  theme,
}) => {
  const {
    videoElement,
    duration,
    currentTime,
    isPlaying,
    trimStart,
    trimEnd,
    setTrimStart,
    setTrimEnd,
    play,
    pause,
    seek,
    loadVideo,
    exportVideo,
    isExporting,
    exportProgress,
  } = useVideoEditor();

  const videoContainerRef = useRef<HTMLDivElement>(null);

  // Load video when blob changes
  useEffect(() => {
    if (sourceBlob && isOpen) {
      loadVideo(sourceBlob);
    }
  }, [sourceBlob, isOpen, loadVideo]);

  // Attach video element to container
  useEffect(() => {
    if (videoElement && videoContainerRef.current) {
      videoElement.style.width = '100%';
      videoElement.style.height = '100%';
      videoElement.style.objectFit = 'contain';
      videoContainerRef.current.innerHTML = '';
      videoContainerRef.current.appendChild(videoElement);
    }
  }, [videoElement]);

  const handleExport = useCallback(async () => {
    const blob = await exportVideo();
    if (blob) {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `edited-recording-${Date.now()}.webm`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  }, [exportVideo]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 10);
    return `${mins}:${secs.toString().padStart(2, '0')}.${ms}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div
        className={`w-full max-w-4xl max-h-[90vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col ${
          theme === 'dark'
            ? 'bg-gray-900 border border-gray-800'
            : 'bg-white border border-gray-200'
        }`}
      >
        {/* Header */}
        <div
          className={`flex items-center justify-between p-4 border-b ${
            theme === 'dark' ? 'border-gray-800' : 'border-gray-200'
          }`}
        >
          <h2 className="text-xl font-bold">Video Editor</h2>
          <button
            onClick={onClose}
            className={`p-2 rounded-lg transition-colors ${
              theme === 'dark'
                ? 'text-gray-400 hover:text-white hover:bg-gray-800'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Video Preview */}
        <div className="flex-1 p-4 min-h-0">
          <div
            ref={videoContainerRef}
            className={`w-full aspect-video rounded-xl overflow-hidden ${
              theme === 'dark' ? 'bg-black' : 'bg-gray-900'
            }`}
          >
            {!sourceBlob && (
              <div className="w-full h-full flex items-center justify-center text-gray-400">
                No video loaded
              </div>
            )}
          </div>
        </div>

        {/* Controls */}
        <div className={`p-4 border-t ${theme === 'dark' ? 'border-gray-800' : 'border-gray-200'}`}>
          {/* Timeline */}
          <div className="mb-4 space-y-2">
            <div className="flex items-center justify-between text-sm text-gray-400">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>

            <div className="relative h-8 bg-gray-700 rounded-lg overflow-hidden">
              {/* Trim region */}
              <div
                className="absolute top-0 bottom-0 bg-indigo-600/30"
                style={{
                  left: `${(trimStart / duration) * 100}%`,
                  right: `${100 - (trimEnd / duration) * 100}%`,
                }}
              />

              {/* Progress */}
              <div
                className="absolute top-0 bottom-0 left-0 bg-indigo-600/50"
                style={{ width: `${(currentTime / duration) * 100}%` }}
              />

              {/* Scrubber */}
              <input
                type="range"
                min={0}
                max={duration}
                step={0.1}
                value={currentTime}
                onChange={(e) => seek(Number(e.target.value))}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
            </div>

            {/* Trim Controls */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Scissors className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-400">Clip duration:</span>
                <span className="text-sm font-mono">{formatTime(trimEnd - trimStart)}</span>
              </div>

              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-400">Start:</label>
                <input
                  type="number"
                  min={0}
                  max={trimEnd}
                  step={0.1}
                  value={trimStart}
                  onChange={(e) => setTrimStart(Number(e.target.value))}
                  className="w-20 px-2 py-1 bg-gray-700 rounded text-sm"
                />
              </div>

              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-400">End:</label>
                <input
                  type="number"
                  min={trimStart}
                  max={duration}
                  step={0.1}
                  value={trimEnd}
                  onChange={(e) => setTrimEnd(Number(e.target.value))}
                  className="w-20 px-2 py-1 bg-gray-700 rounded text-sm"
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={isPlaying ? pause : play}
                className="p-3 bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors"
              >
                {isPlaying ? (
                  <Pause className="w-5 h-5 text-white" />
                ) : (
                  <Play className="w-5 h-5 text-white" />
                )}
              </button>
            </div>

            <button
              onClick={handleExport}
              disabled={isExporting || !sourceBlob}
              className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all ${
                isExporting || !sourceBlob
                  ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                  : 'bg-green-600 hover:bg-green-700 text-white'
              }`}
            >
              {isExporting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Exporting... {Math.round(exportProgress)}%
                </>
              ) : (
                <>
                  <Download className="w-5 h-5" />
                  Export
                </>
              )}
            </button>
          </div>

          {/* Export Progress Bar */}
          {isExporting && (
            <div className="mt-3 h-2 bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 transition-all duration-200"
                style={{ width: `${exportProgress}%` }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VideoEditor;
