import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Mic, MicOff, Video, VideoOff, MonitorUp, MonitorOff, MessageSquare, Users, Hand, LogOut, Circle, Subtitles, FileText, PenTool, BarChart3, SlidersHorizontal, Image } from 'lucide-react';
import { useMeetingStore } from '../stores/useMeetingStore';
import { SubtitleSettings } from './SubtitleSettings';
import { VirtualBackgroundSelector } from './VirtualBackgroundSelector';
import { supportsGetDisplayMedia, supportsCaptureStream, isIOS } from '../utils/browser';

interface MeetingControlsProps {
  isRecording?: boolean;
  onToggleChat: () => void;
  onToggleParticipants: () => void;
  onLeave: () => void;
  onStartRecording?: () => void;
  onStopRecording?: () => void;
  chatOpen: boolean;
  isSubtitleEnabled?: boolean;
  onToggleSubtitles?: () => void;
  onOpenSummary?: () => void;
  isWhiteboardOpen?: boolean;
  onToggleWhiteboard?: () => void;
  onTogglePolls?: () => void;
}

export const MeetingControls: React.FC<MeetingControlsProps> = ({
  isRecording,
  onToggleChat,
  onToggleParticipants,
  onLeave,
  onStartRecording,
  onStopRecording,
  chatOpen,
  isSubtitleEnabled,
  onToggleSubtitles,
  onOpenSummary,
  isWhiteboardOpen,
  onToggleWhiteboard,
  onTogglePolls,
}) => {
  const { t } = useTranslation();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { isMuted, isCameraOff, isScreenSharing, isHandRaised, toggleMute, toggleCamera, toggleScreenShare, toggleHandRaise, virtualBgMode } = useMeetingStore();

  const [virtualBgOpen, setVirtualBgOpen] = useState(false);

  const ControlButton: React.FC<{
    onClick: () => void;
    active?: boolean;
    danger?: boolean;
    disabled?: boolean;
    icon: React.ReactNode;
    label: string;
    badge?: boolean;
  }> = ({ onClick, active, danger, disabled, icon, label, badge }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`relative flex flex-col items-center gap-1 p-2 sm:p-3 rounded-xl transition-all ${
        disabled
          ? 'text-gray-600 cursor-not-allowed opacity-50'
          : danger
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
    <div className="relative bg-gray-900/80 backdrop-blur border-t border-gray-800 pb-[env(safe-area-inset-bottom)]">
      {/* 横向滚动容器 — 手机端可以滚动查看更多按钮 */}
      <div className="flex items-center justify-center gap-1 sm:gap-2 px-2 py-2 sm:py-3 overflow-x-auto scrollbar-hide">
        <ControlButton
          onClick={() => { toggleMute(); }}
          active={isMuted}
          icon={isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          label={isMuted ? t('controls.unmute') : t('controls.mute')}
        />
        <ControlButton
          onClick={() => { toggleCamera(); }}
          active={isCameraOff}
          disabled={isScreenSharing}
          icon={isCameraOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
          label={isScreenSharing ? t('controls.sharing') : isCameraOff ? t('controls.startVideo') : t('controls.stopVideo')}
        />
        {supportsCaptureStream && (
          <div className="relative">
            <ControlButton
              onClick={() => setVirtualBgOpen(!virtualBgOpen)}
              active={virtualBgMode !== 'none'}
              icon={<Image className="w-5 h-5" />}
              label={t('controls.bg')}
            />
            {virtualBgOpen && (
              <VirtualBackgroundSelector isOpen={virtualBgOpen} onClose={() => setVirtualBgOpen(false)} />
            )}
          </div>
        )}
        {supportsGetDisplayMedia && (
          <ControlButton
            onClick={() => { toggleScreenShare(); }}
            active={isScreenSharing}
            icon={isScreenSharing ? <MonitorOff className="w-5 h-5" /> : <MonitorUp className="w-5 h-5" />}
            label={isScreenSharing ? t('controls.stopShare') : t('controls.share')}
          />
        )}
        <ControlButton
          onClick={() => { toggleHandRaise(); }}
          active={isHandRaised}
          icon={<Hand className="w-5 h-5" />}
          label={isHandRaised ? t('controls.lower') : t('controls.raise')}
          badge={isHandRaised}
        />

        {/* 分割线 — 手机端隐藏 */}
        <div className="w-px h-8 bg-gray-700 mx-1 hidden sm:block" />

        {onToggleSubtitles && (
          <div className="relative flex items-center">
            <ControlButton
              onClick={onToggleSubtitles}
              active={isSubtitleEnabled}
              icon={<Subtitles className="w-5 h-5" />}
              label={t('controls.subtitles')}
            />
            {isSubtitleEnabled && (
              <button
                onClick={() => setSettingsOpen(!settingsOpen)}
                className="absolute -top-1 -right-1 w-4 h-4 bg-gray-700 hover:bg-gray-600 rounded-full flex items-center justify-center z-10"
                aria-label={t('subtitles.settings')}
              >
                <SlidersHorizontal className="w-2.5 h-2.5 text-gray-300" />
              </button>
            )}
            {settingsOpen && (
              <SubtitleSettings isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
            )}
          </div>
        )}

        {onOpenSummary && (
          <ControlButton
            onClick={onOpenSummary}
            icon={<FileText className="w-5 h-5" />}
            label={t('controls.summary')}
          />
        )}

        {onToggleWhiteboard && (
          <ControlButton
            onClick={onToggleWhiteboard}
            active={isWhiteboardOpen}
            icon={<PenTool className="w-5 h-5" />}
            label={t('meeting.board')}
          />
        )}

        {onTogglePolls && (
          <ControlButton
            onClick={onTogglePolls}
            icon={<BarChart3 className="w-5 h-5" />}
            label={t('meeting.polls')}
          />
        )}

        {onStartRecording && onStopRecording && (
          <ControlButton
            onClick={isRecording ? onStopRecording : onStartRecording}
            danger={isRecording}
            icon={<Circle className={`w-5 h-5 ${isRecording ? 'fill-red-500 animate-pulse' : ''}`} />}
            label={isRecording ? t('controls.stopRec') : t('controls.record')}
          />
        )}

        <ControlButton
          onClick={onToggleChat}
          active={chatOpen}
          icon={<MessageSquare className="w-5 h-5" />}
          label={t('meeting.chat')}
        />
        <ControlButton
          onClick={onToggleParticipants}
          icon={<Users className="w-5 h-5" />}
          label={t('meeting.people')}
        />

        <div className="w-px h-8 bg-gray-700 mx-1 hidden sm:block" />

        <ControlButton
          onClick={onLeave}
          danger
          icon={<LogOut className="w-5 h-5" />}
          label={t('controls.leave')}
        />
      </div>

      {/* 底部指示器 — 手机端显示滚动提示 */}
      <div className="flex justify-center gap-1 pb-1 sm:hidden">
        <div className="w-1.5 h-1.5 rounded-full bg-gray-500" />
        <div className="w-1.5 h-1.5 rounded-full bg-gray-600" />
        <div className="w-1.5 h-1.5 rounded-full bg-gray-700" />
      </div>
    </div>
  );
};
