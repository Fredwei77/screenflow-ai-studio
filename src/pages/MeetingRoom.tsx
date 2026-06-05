import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { ParticipantGrid } from '../components/ParticipantGrid';
import { MeetingControls } from '../components/MeetingControls';
import { ChatPanel } from '../components/ChatPanel';
import { ParticipantList } from '../components/ParticipantList';
import { useMeetingStore } from '../stores/useMeetingStore';
import { useChatStore } from '../stores/useChatStore';
import { useWebRTC } from '../hooks/useWebRTC';
import { useVirtualBackground } from '../hooks/useVirtualBackground';
import { usePrivacyBlur } from '../hooks/usePrivacyBlur';
import { RemoteAudioPlayer } from '../components/RemoteAudioPlayer';
import { SubtitleOverlay } from '../components/SubtitleOverlay';
import { useSubtitles } from '../hooks/useSubtitles';
import { useSummary } from '../hooks/useSummary';
import { SummaryModal } from '../components/SummaryModal';
import { WhiteboardPanel } from '../components/WhiteboardPanel';
import { PollPanel } from '../components/PollPanel';
import { RecordingList } from '../components/RecordingList';
import { BlurOverlay, type BlurRegion } from '../components/BlurOverlay';
import { useWhiteboardStore } from '../stores/useWhiteboardStore';
import { useSubtitleStore } from '../stores/useSubtitleStore';
import { useSummaryStore } from '../stores/useSummaryStore';
import { usePollStore } from '../stores/usePollStore';
import { useMeetingRecording } from '../hooks/useMeetingRecording';
import { getSocket, leaveRoom, disconnectSocket, sendMediaState } from '../services/socket';
import { supportsGetDisplayMedia } from '../utils/browser';
import { useTheme } from '../hooks/useTheme';
import { Copy, Check, X, LogOut } from 'lucide-react';
import { Modal } from '../components/ui/Modal';
import { chatApi } from '../services/api';

export const MeetingRoom: React.FC = () => {
  const { t } = useTranslation();
  const { meetingId } = useParams<{ meetingId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { theme } = useTheme();

  const userName = searchParams.get('name') || t('common.anonymous');
  const isHost = searchParams.get('host') === 'true';

  const { participants, localStream, setLocalStream, remoteStreams, isMuted, isCameraOff, isScreenSharing, isHandRaised, reset, virtualBgMode, virtualBgColor, virtualBgImageUrl } = useMeetingStore();
  const addMessage = useChatStore((s) => s.addMessage);
  const setMessages = useChatStore((s) => s.setMessages);
  const clearMessages = useChatStore((s) => s.clearMessages);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarTab, setSidebarTab] = useState<'chat' | 'participants' | 'whiteboard' | 'polls' | 'recordings'>('chat');
  const [showBlur, setShowBlur] = useState(false);
  const [blurRegions, setBlurRegions] = useState<BlurRegion[]>([]);
  const [copied, setCopied] = useState(false);
  const [currentUserId, setCurrentUserId] = useState('');
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [screenShareStream, setScreenShareStream] = useState<MediaStream | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const processedStreamRef = useRef<MediaStream | null>(null);

  // Virtual background processing
  const processedStream = useVirtualBackground(localStream, {
    mode: virtualBgMode,
    color: virtualBgColor,
    imageUrl: virtualBgImageUrl || undefined,
    blurRadius: 12,
  });

  // Use processed stream when virtual bg is active, otherwise raw stream
  const effectiveStream = virtualBgMode !== 'none' && processedStream ? processedStream : localStream;
  const blurSourceStream = isScreenSharing ? screenShareStream : effectiveStream;
  const privacyBlurStream = usePrivacyBlur(blurSourceStream, blurRegions, localStream);
  const localPreviewStream = privacyBlurStream.outputStream || blurSourceStream;

  // Keep processedStreamRef in sync
  useEffect(() => {
    processedStreamRef.current = effectiveStream;
  }, [effectiveStream]);

  // SFU publishes the raw media stream once. Background changes replace only
  // the video track below so the microphone producer is not recreated.
  const { joinRoom: sfuJoinRoom, cleanupAll, replaceVideoTrack } = useWebRTC(localStream);
  const { isSubtitleEnabled, interimTranscript, toggleSubtitles } = useSubtitles(meetingId || '', userName, currentUserId);
  const { toggleSummaryModal } = useSummary();
  const { isWhiteboardOpen, toggleWhiteboard } = useWhiteboardStore();
  const { isRecording, startRecording, stopRecording } = useMeetingRecording(meetingId || '', currentUserId, userName, localPreviewStream || localStream);

  const getLiveVideoTrack = (stream?: MediaStream | null) => {
    const track = stream?.getVideoTracks()[0];
    return track?.readyState === 'live' ? track : null;
  };

  // Initialize local media stream
  useEffect(() => {
    const init = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            sampleRate: 48000,
            channelCount: 1,
          },
        });
        localStreamRef.current = stream;
        setLocalStream(stream);
        setMediaError(null);
      } catch (err: any) {
        console.error('Failed to get media:', err);
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          setMediaError(t('subtitles.micDeniedTip'));
        } else if (err.name === 'NotFoundError') {
          setMediaError('No camera or microphone found.');
        } else {
          setMediaError(err.message || 'Failed to access camera/microphone.');
        }
      }
    };
    init();

    return () => {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  // Join room via SFU (after local media is ready)
  useEffect(() => {
    if (!meetingId) return;

    const socket = getSocket();
    const handleRoomJoined = (data: { userId: string; participants: any[] }) => {
      setCurrentUserId(data.userId);
      chatApi.getMessages(meetingId).then(setMessages).catch((error) => {
        console.error('Failed to load chat messages:', error);
      });
    };

    const handleChatMessage = (msg: any) => {
      addMessage(msg);
    };

    const handleParticipantsUpdate = (data: { participants: any[] }) => {
      useMeetingStore.getState().setParticipants(data.participants);
    };

    socket.on('room-joined', handleRoomJoined);
    socket.on('chat:message', handleChatMessage);
    socket.on('participants-update', handleParticipantsUpdate);

    // Join room via SFU (this handles both socket join and mediasoup setup)
    sfuJoinRoom(meetingId, userName);

    return () => {
      socket.off('room-joined', handleRoomJoined);
      socket.off('chat:message', handleChatMessage);
      socket.off('participants-update', handleParticipantsUpdate);
      leaveRoom(meetingId);
      cleanupAll();
      clearMessages();
      reset();
      useWhiteboardStore.getState().reset();
      useSubtitleStore.getState().reset();
      useSummaryStore.getState().reset();
      usePollStore.getState().reset();
    };
  }, [meetingId]);

  // Sync mute/camera state to remote peers
  useEffect(() => {
    if (meetingId) {
      sendMediaState(meetingId, { isMuted, isCameraOff, isHandRaised });
    }
  }, [isMuted, isCameraOff, isHandRaised, meetingId]);

  // Toggle mute on local stream
  useEffect(() => {
    if (localStream) {
      localStream.getAudioTracks().forEach((t) => { t.enabled = !isMuted; });
    }
  }, [isMuted, localStream]);

  // Toggle camera on local stream (only when not screen sharing)
  useEffect(() => {
    if (isScreenSharing) return;
    if (localStream) {
      localStream.getVideoTracks().forEach((t) => { t.enabled = !isCameraOff; });
    }
    // Also disable video track on processed stream when virtual bg is active
    if (processedStreamRef.current && virtualBgMode !== 'none') {
      processedStreamRef.current.getVideoTracks().forEach((t) => { t.enabled = !isCameraOff; });
    }
  }, [isCameraOff, localStream, isScreenSharing, virtualBgMode]);

  // Screen sharing
  useEffect(() => {
    const restoreCameraAfterScreenShare = () => {
      const streamToRestore = processedStreamRef.current || localStreamRef.current || localStream;
      if (!streamToRestore) return;

      streamToRestore.getVideoTracks().forEach((track) => {
        track.enabled = !useMeetingStore.getState().isCameraOff;
      });

      const cameraTrack = getLiveVideoTrack(streamToRestore);
      if (cameraTrack) {
        replaceVideoTrack(cameraTrack);
      }
    };

    if (!isScreenSharing) {
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach((t) => t.stop());
        screenStreamRef.current = null;
      }
      setScreenShareStream(null);
      restoreCameraAfterScreenShare();
      return;
    }

    const startScreenShare = async () => {
      if (!supportsGetDisplayMedia) {
        alert(t('meeting.screenShareNotSupported', 'Screen sharing is not supported on this device.'));
        useMeetingStore.getState().toggleScreenShare();
        return;
      }
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
        screenStreamRef.current = screenStream;
        setScreenShareStream(screenStream);

        const screenTrack = getLiveVideoTrack(screenStream);
        if (screenTrack) {
          replaceVideoTrack(screenTrack);
          screenTrack.onended = () => {
            restoreCameraAfterScreenShare();
            setScreenShareStream(null);
            if (useMeetingStore.getState().isScreenSharing) {
              useMeetingStore.getState().toggleScreenShare();
            }
          };
        }
      } catch (err) {
        console.error('Screen share failed:', err);
        useMeetingStore.getState().toggleScreenShare();
      }
    };

    startScreenShare();

    return () => {
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach((t) => t.stop());
        screenStreamRef.current = null;
      }
      setScreenShareStream(null);
    };
  }, [isScreenSharing, localStream, replaceVideoTrack]);

  useEffect(() => {
    const replacementTrack = getLiveVideoTrack(privacyBlurStream.outputStream)
      || (isScreenSharing ? getLiveVideoTrack(screenShareStream) : getLiveVideoTrack(effectiveStream));

    if (replacementTrack) {
      replaceVideoTrack(replacementTrack);
    }
  }, [effectiveStream, isScreenSharing, privacyBlurStream.outputStream, replaceVideoTrack, screenShareStream]);

  const handleLeave = useCallback(() => {
    setShowLeaveConfirm(true);
  }, []);

  const confirmLeave = useCallback(() => {
    if (localStreamRef.current) localStreamRef.current.getTracks().forEach((t) => t.stop());
    if (screenStreamRef.current) screenStreamRef.current.getTracks().forEach((t) => t.stop());
    if (meetingId) leaveRoom(meetingId);
    disconnectSocket();
    navigate('/');
  }, [navigate, meetingId]);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(meetingId || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleToggleChat = () => {
    if (sidebarOpen && sidebarTab === 'chat') {
      setSidebarOpen(false);
    } else {
      setSidebarTab('chat');
      setSidebarOpen(true);
    }
  };

  const handleToggleParticipants = () => {
    if (sidebarOpen && sidebarTab === 'participants') {
      setSidebarOpen(false);
    } else {
      setSidebarTab('participants');
      setSidebarOpen(true);
    }
  };

  const handleToggleWhiteboard = () => {
    if (sidebarOpen && sidebarTab === 'whiteboard') {
      setSidebarOpen(false);
      useWhiteboardStore.getState().setWhiteboardOpen(false);
    } else {
      setSidebarTab('whiteboard');
      setSidebarOpen(true);
      useWhiteboardStore.getState().setWhiteboardOpen(true);
    }
  };

  const handleTogglePolls = () => {
    if (sidebarOpen && sidebarTab === 'polls') {
      setSidebarOpen(false);
    } else {
      setSidebarTab('polls');
      setSidebarOpen(true);
    }
  };

  const handleToggleRecordings = () => {
    if (sidebarOpen && sidebarTab === 'recordings') {
      setSidebarOpen(false);
    } else {
      setSidebarTab('recordings');
      setSidebarOpen(true);
    }
  };

  // Build participant views for grid
  const participantViews = [
    {
      userId: currentUserId,
      name: userName,
      stream: localPreviewStream || undefined,
      isMuted,
      isCameraOff: isScreenSharing ? false : isCameraOff,
      isScreenSharing,
      isHandRaised,
      isLocal: true,
    },
    ...participants
      .filter((p) => p.userId !== currentUserId)
      .map((p) => ({
        userId: p.userId,
        name: p.userName || t('common.unknown'),
        stream: remoteStreams.get(p.userId),
        isMuted: p.isMuted,
        isCameraOff: p.isCameraOff,
        isHandRaised: p.isHandRaised,
        isLocal: false,
      })),
  ];
  const participantCount = participantViews.length;
  const sidebarParticipants = participantViews.map((participant) => ({
    userId: participant.userId,
    userName: participant.name,
    role: participants.find((item) => item.userId === participant.userId)?.role,
    isMuted: participant.isMuted,
    isCameraOff: participant.isCameraOff,
    isHandRaised: participant.isHandRaised,
  }));

  return (
    <div className={`flex flex-col h-[100dvh] h-screen ${theme === 'dark' ? 'bg-gray-950 text-white' : 'bg-gray-50 text-gray-900'}`}>
      {/* Top Bar */}
      <header className={`h-12 sm:h-14 flex items-center justify-between px-3 sm:px-4 pt-[env(safe-area-inset-top)] border-b shrink-0 ${theme === 'dark' ? 'bg-gray-900/80 border-gray-800' : 'bg-white/80 border-gray-200'} backdrop-blur`}>
        <div className="flex items-center gap-2 sm:gap-3">
          <h1 className="text-sm sm:text-base font-semibold truncate max-w-[120px] sm:max-w-none">
            {meetingId}
          </h1>
          <button
            onClick={handleCopyCode}
            className="flex items-center gap-1 px-2 py-1 rounded-md text-xs text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
            title={t('meeting.copyCode')}
          >
            {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{copied ? t('common.copied') : t('meeting.copyCodeBtn')}</span>
          </button>
        </div>
        <div className="text-xs text-gray-500">
          {t('meeting.participants', { count: participantCount })}
        </div>
      </header>

      {/* Main Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Video Grid */}
        <div className="flex-1 relative p-2 sm:p-4 overflow-y-auto">
          {mediaError ? (
            <div className="flex flex-col items-center justify-center h-full gap-4">
              <div className="w-16 h-16 rounded-full bg-red-600/20 flex items-center justify-center">
                <span className="text-2xl">!</span>
              </div>
              <p className="text-gray-400 text-sm text-center max-w-sm">{mediaError}</p>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg text-sm text-white"
              >
                Retry
              </button>
            </div>
          ) : (
            <ParticipantGrid participants={participantViews} />
          )}
          <RemoteAudioPlayer streams={remoteStreams} />
          <SubtitleOverlay interimTranscript={interimTranscript} />
          <BlurOverlay
            isVisible={showBlur}
            theme={theme}
            regions={blurRegions}
            onRegionsChange={setBlurRegions}
          />
        </div>

        <SummaryModal />

        {/* Sidebar */}
        {sidebarOpen && (
          <div className={`w-72 sm:w-80 border-l flex flex-col shrink-0 ${theme === 'dark' ? 'bg-gray-900/50 border-gray-800' : 'bg-white border-gray-200'}`}>
            <div className="flex items-center justify-between px-3 py-2 border-b border-gray-800">
              <div className="flex gap-1">
                <button
                  onClick={() => setSidebarTab('chat')}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${sidebarTab === 'chat' ? 'bg-gray-800 text-white' : 'text-gray-400 hover:text-white'}`}
                >
                  {t('meeting.chat')}
                </button>
                <button
                  onClick={() => setSidebarTab('participants')}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${sidebarTab === 'participants' ? 'bg-gray-800 text-white' : 'text-gray-400 hover:text-white'}`}
                >
                  {t('meeting.people')}
                </button>
                <button
                  onClick={() => setSidebarTab('whiteboard')}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${sidebarTab === 'whiteboard' ? 'bg-gray-800 text-white' : 'text-gray-400 hover:text-white'}`}
                >
                  {t('meeting.board')}
                </button>
                <button
                  onClick={() => setSidebarTab('polls')}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${sidebarTab === 'polls' ? 'bg-gray-800 text-white' : 'text-gray-400 hover:text-white'}`}
                >
                  {t('meeting.polls')}
                </button>
                <button
                  onClick={() => setSidebarTab('recordings')}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${sidebarTab === 'recordings' ? 'bg-gray-800 text-white' : 'text-gray-400 hover:text-white'}`}
                >
                  {t('meeting.recs')}
                </button>
              </div>
              <button onClick={() => { setSidebarOpen(false); useWhiteboardStore.getState().setWhiteboardOpen(false); }} className="p-1 rounded text-gray-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              {sidebarTab === 'chat' ? (
                <ChatPanel roomId={meetingId || ''} currentUserId={currentUserId} userName={userName} />
              ) : sidebarTab === 'whiteboard' ? (
                <WhiteboardPanel meetingId={meetingId || ''} userId={currentUserId} userName={userName} onClose={() => { setSidebarOpen(false); useWhiteboardStore.getState().setWhiteboardOpen(false); }} />
              ) : sidebarTab === 'polls' ? (
                <PollPanel meetingId={meetingId || ''} userId={currentUserId} userName={userName} onClose={() => setSidebarOpen(false)} isHost={isHost} />
              ) : sidebarTab === 'recordings' ? (
                <div className="flex flex-col h-full">
                  <div className="flex items-center justify-between px-3 py-2 bg-gray-800 border-b border-gray-700">
                    <h3 className="text-sm font-medium text-white">{t('meeting.recordings')}</h3>
                    <button onClick={() => setSidebarOpen(false)} className="p-1 rounded text-gray-400 hover:text-white transition-colors">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex-1 overflow-y-auto">
                    <RecordingList meetingId={meetingId || ''} />
                  </div>
                </div>
              ) : (
                <ParticipantList participants={sidebarParticipants} currentUserId={currentUserId} />
              )}
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      <MeetingControls
        onToggleChat={handleToggleChat}
        onToggleParticipants={handleToggleParticipants}
        onLeave={handleLeave}
        chatOpen={sidebarOpen && sidebarTab === 'chat'}
        isParticipantsOpen={sidebarOpen && sidebarTab === 'participants'}
        isSubtitleEnabled={isSubtitleEnabled}
        onToggleSubtitles={toggleSubtitles}
        onOpenSummary={toggleSummaryModal}
        isWhiteboardOpen={isWhiteboardOpen}
        onToggleWhiteboard={handleToggleWhiteboard}
        isPollsOpen={sidebarOpen && sidebarTab === 'polls'}
        onTogglePolls={handleTogglePolls}
        isRecording={isRecording}
        onStartRecording={startRecording}
        onStopRecording={stopRecording}
        isBlurActive={showBlur}
        onToggleBlur={() => setShowBlur((v) => !v)}
      />

      <Modal isOpen={showLeaveConfirm} onClose={() => setShowLeaveConfirm(false)} title={t('leave.title')} maxWidth="max-w-sm">
        <p className="text-gray-300 mb-6">{t('leave.confirm')}</p>
        <div className="flex gap-3 justify-end">
          <button onClick={() => setShowLeaveConfirm(false)} className="px-4 py-2 rounded-lg text-sm font-medium bg-gray-700 hover:bg-gray-600 text-white transition-colors">{t('leave.stay')}</button>
          <button onClick={confirmLeave} className="px-4 py-2 rounded-lg text-sm font-medium bg-red-600 hover:bg-red-700 text-white transition-colors">{t('leave.leave')}</button>
        </div>
      </Modal>
    </div>
  );
};
