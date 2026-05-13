import { useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useSubtitleStore } from '../stores/useSubtitleStore';
import { useSummaryStore } from '../stores/useSummaryStore';
import { useUIStore } from '../stores/useUIStore';
import { useSpeechRecognition } from './useSpeechRecognition';
import { sendSubtitle, getSocket } from '../services/socket';

export function useSubtitles(meetingId: string, userName: string, currentUserId: string) {
  const { t } = useTranslation();
  const isSubtitleEnabled = useSubtitleStore((s) => s.isSubtitleEnabled);
  const appendTranscript = useSummaryStore((s) => s.appendTranscript);
  const language = useUIStore((s) => s.language);
  const speechLangOverride = useSubtitleStore((s) => s.speechLangOverride);
  const subtitleAutoHideMs = useSubtitleStore((s) => s.subtitleAutoHideMs);
  const speechLang = speechLangOverride || (language === 'zh' ? 'zh-CN' : 'en-US');
  const { transcript, interimTranscript, startRecognition, stopRecognition } = useSpeechRecognition(isSubtitleEnabled, speechLang, t);

  const lastBroadcastRef = useRef('');
  const isEnabledRef = useRef(isSubtitleEnabled);
  const interimThrottleRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastInterimRef = useRef('');
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    isEnabledRef.current = isSubtitleEnabled;
  }, [isSubtitleEnabled]);

  // Start/stop speech recognition based on subtitle toggle
  useEffect(() => {
    if (isSubtitleEnabled) {
      startRecognition();
    } else {
      stopRecognition();
      useSubtitleStore.getState().clearAllRemoteInterims();
    }
    return () => { stopRecognition(); };
  }, [isSubtitleEnabled, startRecognition, stopRecognition]);

  // Broadcast final transcripts to remote peers
  useEffect(() => {
    if (!isSubtitleEnabled || !meetingId) return;
    if (!transcript || transcript === lastBroadcastRef.current) return;

    lastBroadcastRef.current = transcript;
    sendSubtitle(meetingId, { text: transcript, isFinal: true });

    useSubtitleStore.getState().addSubtitle({
      id: crypto.randomUUID(),
      text: transcript,
      userId: currentUserId,
      userName,
      isFinal: true,
      timestamp: Date.now(),
    });

    appendTranscript(transcript);
  }, [transcript, isSubtitleEnabled, meetingId, currentUserId, userName, appendTranscript]);

  // Broadcast interim transcripts (throttled 300ms)
  useEffect(() => {
    if (!isSubtitleEnabled || !meetingId) return;
    if (!interimTranscript || interimTranscript === lastInterimRef.current) return;
    if (interimThrottleRef.current) return;

    interimThrottleRef.current = setTimeout(() => {
      interimThrottleRef.current = null;
      lastInterimRef.current = interimTranscript;
      sendSubtitle(meetingId, { text: interimTranscript, isFinal: false });
    }, 300);

    return () => {
      if (interimThrottleRef.current) {
        clearTimeout(interimThrottleRef.current);
        interimThrottleRef.current = null;
      }
    };
  }, [interimTranscript, isSubtitleEnabled, meetingId]);

  // Listen for remote subtitles
  useEffect(() => {
    if (!meetingId) return;

    const socket = getSocket();
    const handleRemoteSubtitle = (data: {
      userId: string;
      userName: string;
      text: string;
      isFinal: boolean;
      timestamp: number;
    }) => {
      if (!isEnabledRef.current) return;

      if (data.isFinal) {
        useSubtitleStore.getState().clearRemoteInterim(data.userId);
        useSubtitleStore.getState().addSubtitle({
          id: crypto.randomUUID(),
          text: data.text,
          userId: data.userId,
          userName: data.userName,
          isFinal: true,
          timestamp: data.timestamp,
        });
      } else {
        useSubtitleStore.getState().setRemoteInterim(data.userId, data.text, data.userName);
      }
    };

    socket.on('subtitle', handleRemoteSubtitle);
    return () => { socket.off('subtitle', handleRemoteSubtitle); };
  }, [meetingId]);

  // Auto-hide timer: reset on new subtitles, fade out after delay
  const subtitleCount = useSubtitleStore((s) => s.subtitles.length);

  useEffect(() => {
    if (!isSubtitleEnabled || subtitleCount === 0) return;

    useSubtitleStore.getState().markVisible();

    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => {
      useSubtitleStore.setState({ isVisible: false });
    }, subtitleAutoHideMs);

    return () => {
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
        hideTimerRef.current = null;
      }
    };
  }, [subtitleCount, isSubtitleEnabled, subtitleAutoHideMs]);

  const toggleSubtitles = useCallback(() => {
    useSubtitleStore.getState().toggleSubtitles();
  }, []);

  const clearSubtitles = useCallback(() => {
    useSubtitleStore.getState().clearSubtitles();
  }, []);

  return {
    isSubtitleEnabled,
    interimTranscript,
    toggleSubtitles,
    clearSubtitles,
  };
}
