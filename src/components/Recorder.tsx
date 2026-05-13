import React, { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { MediaSourceType } from '../types';

interface RecorderProps {
  stream: MediaStream | null;
  isRecording: boolean;
  error: string | null;
  mediaSource: MediaSourceType;
}

const Recorder: React.FC<RecorderProps> = ({ stream, isRecording, error, mediaSource }) => {
  const { t } = useTranslation();
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (stream) {
      video.srcObject = stream;
      video.play().catch(() => {});
    } else {
      video.srcObject = null;
    }
  }, [stream]);

  useEffect(() => {
    if (!stream) return;
    const handleTrackChange = () => {
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
    };
    stream.getVideoTracks().forEach((t) => {
      t.addEventListener('ended', handleTrackChange);
    });
    return () => {
      stream.getVideoTracks().forEach((t) => {
        t.removeEventListener('ended', handleTrackChange);
      });
    };
  }, [stream]);

  return (
    <div className="relative w-full h-full bg-black rounded-xl overflow-hidden border border-gray-800 shadow-2xl flex items-center justify-center group">
      {error ? (
        <div className="text-red-400 text-center p-6 animate-in fade-in zoom-in">
          <p className="font-bold text-xl mb-2">{t('recording.connectionError')}</p>
          <p className="text-sm opacity-80 max-w-xs">{error}</p>
        </div>
      ) : !stream ? (
        <div className="text-gray-600 text-center p-6">
           <p>{t('recording.initializing')}</p>
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
                    <span className="text-red-100 text-xs font-bold tracking-wider">{t('recording.rec')}</span>
                </div>
            )}
            {!isRecording && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    <p className="text-white/80 font-medium">{t('recording.previewMode')}</p>
                </div>
            )}
        </>
      )}
    </div>
  );
};

export default Recorder;