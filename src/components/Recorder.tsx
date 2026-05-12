import React, { useEffect, useRef } from 'react';
import { MediaSourceType } from '../types';

interface RecorderProps {
  stream: MediaStream | null;
  isRecording: boolean;
  error: string | null;
  mediaSource: MediaSourceType;
}

const Recorder: React.FC<RecorderProps> = ({ stream, isRecording, error, mediaSource }) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current) {
        if (stream) {
            videoRef.current.srcObject = stream;
        } else {
            videoRef.current.srcObject = null;
        }
    }
  }, [stream]);

  return (
    <div className="relative w-full h-full bg-black rounded-xl overflow-hidden border border-gray-800 shadow-2xl flex items-center justify-center group">
      {error ? (
        <div className="text-red-400 text-center p-6 animate-in fade-in zoom-in">
          <p className="font-bold text-xl mb-2">Connection Error</p>
          <p className="text-sm opacity-80 max-w-xs">{error}</p>
        </div>
      ) : !stream ? (
        <div className="text-gray-600 text-center p-6">
           <p>Initializing...</p>
        </div>
      ) : (
        <>
            <video
                ref={videoRef}
                autoPlay
                muted // Mute locally to avoid feedback loop
                playsInline
                className={`w-full h-full object-contain ${mediaSource === 'camera' ? 'scale-x-[-1]' : ''}`} 
            />
            {/* Recording Indicator Overlay */}
            {isRecording && (
                <div className="absolute top-4 right-4 flex items-center gap-2 bg-red-950/80 backdrop-blur border border-red-500/50 px-3 py-1.5 rounded-full z-10">
                    <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                    <span className="text-red-100 text-xs font-bold tracking-wider">REC</span>
                </div>
            )}
            {!isRecording && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    <p className="text-white/80 font-medium">Preview Mode</p>
                </div>
            )}
        </>
      )}
    </div>
  );
};

export default Recorder;