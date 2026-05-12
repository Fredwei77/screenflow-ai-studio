import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { ParticipantGrid } from '../components/ParticipantGrid';
import { MeetingControls } from '../components/MeetingControls';
import { ChatPanel } from '../components/ChatPanel';
import { ParticipantList } from '../components/ParticipantList';
import { useMeetingStore } from '../stores/useMeetingStore';
import { useChatStore } from '../stores/useChatStore';
import { useWebRTC } from '../hooks/useWebRTC';
import { getSocket, joinRoom, leaveRoom, disconnectSocket, sendMediaState } from '../services/socket';
import { useTheme } from '../hooks/useTheme';
import { Copy, Check, X } from 'lucide-react';

export const MeetingRoom: React.FC = () => {
  const { meetingId } = useParams<{ meetingId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { theme } = useTheme();

  const userName = searchParams.get('name') || 'Anonymous';
  const isHost = searchParams.get('host') === 'true';

  const { participants, localStream, setLocalStream, remoteStreams, isMuted, isCameraOff, isHandRaised, reset } = useMeetingStore();
  const addMessage = useChatStore((s) => s.addMessage);
  const clearMessages = useChatStore((s) => s.clearMessages);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarTab, setSidebarTab] = useState<'chat' | 'participants'>('chat');
  const [copied, setCopied] = useState(false);
  const [currentUserId, setCurrentUserId] = useState('');
  const localStreamRef = useRef<MediaStream | null>(null);

  const { cleanupAll, replaceVideoTrack } = useWebRTC(localStream);

  // Initialize local media stream
  useEffect(() => {
    const init = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
          audio: true,
        });
        localStreamRef.current = stream;
        setLocalStream(stream);
      } catch (err) {
        console.error('Failed to get media:', err);
      }
    };
    init();

    return () => {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  // Join room via socket
  useEffect(() => {
    if (!meetingId) return;

    const socket = getSocket();

    const handleRoomJoined = (data: { userId: string; participants: any[] }) => {
      setCurrentUserId(data.userId);
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

    joinRoom(meetingId, userName);

    return () => {
      socket.off('room-joined', handleRoomJoined);
      socket.off('chat:message', handleChatMessage);
      socket.off('participants-update', handleParticipantsUpdate);
      leaveRoom(meetingId);
      cleanupAll();
      clearMessages();
      reset();
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

  // Toggle camera on local stream
  useEffect(() => {
    if (localStream) {
      localStream.getVideoTracks().forEach((t) => { t.enabled = !isCameraOff; });
    }
  }, [isCameraOff, localStream]);

  const handleLeave = useCallback(() => {
    if (localStreamRef.current) localStreamRef.current.getTracks().forEach((t) => t.stop());
    disconnectSocket();
    navigate('/');
  }, [navigate]);

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

  // Build participant views for grid
  const participantViews = [
    {
      userId: currentUserId,
      name: userName,
      stream: localStream || undefined,
      isMuted,
      isCameraOff,
      isHandRaised,
      isLocal: true,
    },
    ...participants
      .filter((p) => p.userId !== currentUserId)
      .map((p) => ({
        userId: p.userId,
        name: p.userName || 'Unknown',
        stream: remoteStreams.get(p.userId),
        isMuted: p.isMuted,
        isCameraOff: p.isCameraOff,
        isHandRaised: p.isHandRaised,
        isLocal: false,
      })),
  ];

  return (
    <div className={`flex flex-col h-screen ${theme === 'dark' ? 'bg-gray-950 text-white' : 'bg-gray-50 text-gray-900'}`}>
      {/* Top Bar */}
      <header className={`h-12 sm:h-14 flex items-center justify-between px-3 sm:px-4 border-b shrink-0 ${theme === 'dark' ? 'bg-gray-900/80 border-gray-800' : 'bg-white/80 border-gray-200'} backdrop-blur`}>
        <div className="flex items-center gap-2 sm:gap-3">
          <h1 className="text-sm sm:text-base font-semibold truncate max-w-[120px] sm:max-w-none">
            {meetingId}
          </h1>
          <button
            onClick={handleCopyCode}
            className="flex items-center gap-1 px-2 py-1 rounded-md text-xs text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
            title="Copy meeting code"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{copied ? 'Copied!' : 'Copy code'}</span>
          </button>
        </div>
        <div className="text-xs text-gray-500">
          {participants.length + 1} participant{participants.length !== 0 ? 's' : ''}
        </div>
      </header>

      {/* Main Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Video Grid */}
        <div className="flex-1 p-2 sm:p-4 overflow-hidden">
          <ParticipantGrid participants={participantViews} />
        </div>

        {/* Sidebar */}
        {sidebarOpen && (
          <div className={`w-72 sm:w-80 border-l flex flex-col shrink-0 ${theme === 'dark' ? 'bg-gray-900/50 border-gray-800' : 'bg-white border-gray-200'}`}>
            <div className="flex items-center justify-between px-3 py-2 border-b border-gray-800">
              <div className="flex gap-1">
                <button
                  onClick={() => setSidebarTab('chat')}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${sidebarTab === 'chat' ? 'bg-gray-800 text-white' : 'text-gray-400 hover:text-white'}`}
                >
                  Chat
                </button>
                <button
                  onClick={() => setSidebarTab('participants')}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${sidebarTab === 'participants' ? 'bg-gray-800 text-white' : 'text-gray-400 hover:text-white'}`}
                >
                  People
                </button>
              </div>
              <button onClick={() => setSidebarOpen(false)} className="p-1 rounded text-gray-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              {sidebarTab === 'chat' ? (
                <ChatPanel roomId={meetingId || ''} currentUserId={currentUserId} />
              ) : (
                <ParticipantList participants={participants} currentUserId={currentUserId} />
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
      />
    </div>
  );
};
