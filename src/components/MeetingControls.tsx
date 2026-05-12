import React from 'react';
import { Mic, MicOff, Video, VideoOff, MonitorUp, MonitorOff, MessageSquare, Users, Hand, LogOut, Circle } from 'lucide-react';
import { useMeetingStore } from '../stores/useMeetingStore';

interface MeetingControlsProps {
  isRecording?: boolean;
  onToggleChat: () => void;
  onToggleParticipants: () => void;
  onLeave: () => void;
  onStartRecording?: () => void;
  onStopRecording?: () => void;
  chatOpen: boolean;
}

export const MeetingControls: React.FC<MeetingControlsProps> = ({
  isRecording,
  onToggleChat,
  onToggleParticipants,
  onLeave,
  onStartRecording,
  onStopRecording,
  chatOpen,
}) => {
  const { isMuted, isCameraOff, isScreenSharing, isHandRaised, toggleMute, toggleCamera, toggleScreenShare, toggleHandRaise } = useMeetingStore();

  const ControlButton: React.FC<{
    onClick: () => void;
    active?: boolean;
    danger?: boolean;
    icon: React.ReactNode;
    label: string;
    badge?: boolean;
  }> = ({ onClick, active, danger, icon, label, badge }) => (
    <button
      onClick={onClick}
      className={`relative flex flex-col items-center gap-1 p-2 sm:p-3 rounded-xl transition-all ${
        danger
          ? 'bg-red-600 hover:bg-red-700 text-white'
          : active
          ? 'bg-gray-700 text-white'
          : 'text-gray-400 hover:text-white hover:bg-gray-800'
      }`}
      aria-label={label}
      title={label}
    >
      {icon}
      <span className="text-[10px] sm:text-xs hidden sm:block">{label}</span>
      {badge && (
        <span className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full" />
      )}
    </button>
  );

  return (
    <div className="flex items-center justify-center gap-1 sm:gap-2 px-2 sm:px-4 py-2 sm:py-3 bg-gray-900/80 backdrop-blur border-t border-gray-800">
      <ControlButton
        onClick={() => { toggleMute(); }}
        active={isMuted}
        icon={isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
        label={isMuted ? 'Unmute' : 'Mute'}
      />
      <ControlButton
        onClick={() => { toggleCamera(); }}
        active={isCameraOff}
        icon={isCameraOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
        label={isCameraOff ? 'Start Video' : 'Stop Video'}
      />
      <ControlButton
        onClick={() => { toggleScreenShare(); }}
        active={isScreenSharing}
        icon={isScreenSharing ? <MonitorOff className="w-5 h-5" /> : <MonitorUp className="w-5 h-5" />}
        label={isScreenSharing ? 'Stop Share' : 'Share'}
      />
      <ControlButton
        onClick={() => { toggleHandRaise(); }}
        active={isHandRaised}
        icon={<Hand className="w-5 h-5" />}
        label={isHandRaised ? 'Lower' : 'Raise'}
        badge={isHandRaised}
      />

      <div className="w-px h-8 bg-gray-700 mx-1 hidden sm:block" />

      {onStartRecording && onStopRecording && (
        <ControlButton
          onClick={isRecording ? onStopRecording : onStartRecording}
          danger={isRecording}
          icon={<Circle className={`w-5 h-5 ${isRecording ? 'fill-red-500 animate-pulse' : ''}`} />}
          label={isRecording ? 'Stop Rec' : 'Record'}
        />
      )}

      <ControlButton
        onClick={onToggleChat}
        active={chatOpen}
        icon={<MessageSquare className="w-5 h-5" />}
        label="Chat"
      />
      <ControlButton
        onClick={onToggleParticipants}
        icon={<Users className="w-5 h-5" />}
        label="People"
      />

      <div className="w-px h-8 bg-gray-700 mx-1 hidden sm:block" />

      <ControlButton
        onClick={onLeave}
        danger
        icon={<LogOut className="w-5 h-5" />}
        label="Leave"
      />
    </div>
  );
};
