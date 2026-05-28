import React, { Suspense, useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { RecorderState, Question, AnalysisMetric, type MediaSourceType, type LayoutMode } from '../types';
import Recorder from '../components/Recorder';
import QuestionPanel from '../components/QuestionPanel';
import PerformanceChart from '../components/PerformanceChart';
import KeyboardShortcuts from '../components/KeyboardShortcuts';
import Teleprompter from '../components/Teleprompter';
import TeleprompterSettings from '../components/TeleprompterSettings';
import BackdropLibrary from '../components/BackdropLibrary';
import OnboardingWizard from '../components/OnboardingWizard';
import LayoutSelector from '../components/LayoutSelector';
import AnnotationLayer from '../components/AnnotationLayer';
import CoverGenerator from '../components/CoverGenerator';
import PublishDashboard from '../components/PublishDashboard';
import { Modal } from '../components/ui/Modal';
import { Button } from '../components/ui/Button';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { useMockSpeechRecognition } from '../hooks/useMockSpeechRecognition';
import { useMediaStream } from '../hooks/useMediaStream';
import { useRecording } from '../hooks/useRecording';
import { useAudioLevel } from '../hooks/useAudioLevel';
import { useTeleprompter } from '../hooks/useTeleprompter';
import { useVirtualBackground } from '../hooks/useVirtualBackground';
import { useStreamCompositor, type PiPPosition } from '../hooks/useStreamCompositor';
import { useTheme } from '../hooks/useTheme';
import { useMeetingStore, type BackgroundMode } from '../stores/useMeetingStore';
import { aiApi } from '../services/api';
import { config } from '../config';
import { trackCommercialIntent } from '../lib/commercialization';
import { formatDuration } from '../lib/formatters';
import { downloadFile, transcriptToSRT, transcriptToVTT, splitTextIntoSegments } from '../utils/subtitles';
import { Mic, Monitor, Camera, Square, Play, Download, Settings2, Moon, Sun, ArrowLeft, Image, Film, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Pencil, Upload, Crown, Lock } from 'lucide-react';

const VideoEditor = React.lazy(() => import('../components/VideoEditor'));

export const RecordPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { stream, cameraStream, screenStream, mediaSource, error, setError, switchMediaSource, initCamera } = useMediaStream();
  const { recorderState, setRecorderState, downloadUrl, recordingDuration, startRecording, stopRecording, downloadVideo, createDownloadUrl, recordedChunks } = useRecording();
  const { audioLevel, startVisualization, stopVisualization } = useAudioLevel();

  // Layout compositing
  const detectBestLayout = useCallback((source: MediaSourceType): LayoutMode => {
    if (source === 'screen') return 'screen-only';
    if (source === 'camera') return 'camera-only';
    return 'pip';
  }, []);
  const [layoutMode, setLayoutMode] = useState<LayoutMode>(() => detectBestLayout('camera'));
  const [pipPosition, setPipPosition] = useState<PiPPosition>({ x: 16, y: 16 });
  const [sideBySideRatio, setSideBySideRatio] = useState(0.35);
  const [previewBounds, setPreviewBounds] = useState<{ left: number; top: number; width: number; height: number } | null>(null);
  const previewRef = useRef<HTMLDivElement | null>(null);
  const dragStateRef = useRef<
    | { type: 'pip'; startX: number; startY: number; startOffsetX: number; startOffsetY: number }
    | { type: 'divider'; rectLeft: number; rectWidth: number }
    | null
  >(null);
  const { outputStream: compositedStream, compositorState } = useStreamCompositor(
    cameraStream, screenStream, layoutMode, pipPosition, 25, sideBySideRatio,
  );
  const compositorOutput = compositedStream || stream;

  // Sync layout to media source changes
  useEffect(() => {
    setLayoutMode(detectBestLayout(mediaSource));
  }, [mediaSource, detectBestLayout]);

  useEffect(() => {
    if (!cameraStream && layoutMode !== 'screen-only') {
      setLayoutMode(screenStream ? 'screen-only' : 'camera-only');
      return;
    }
    if (!screenStream && layoutMode !== 'camera-only') {
      setLayoutMode('camera-only');
    }
  }, [cameraStream, layoutMode, screenStream]);

  // Listen for screen track ended → fall back to camera-only
  useEffect(() => {
    const handleScreenEnded = () => {
      switchMediaSource('camera');
      setLayoutMode('camera-only');
    };
    window.addEventListener('screen-track-ended', handleScreenEnded);
    return () => window.removeEventListener('screen-track-ended', handleScreenEnded);
  }, [switchMediaSource]);

  // Teleprompter
  const teleprompter = useTeleprompter();
  const [showTeleprompterSettings, setShowTeleprompterSettings] = useState(false);

  // Backdrop library
  const [showBackdropLibrary, setShowBackdropLibrary] = useState(false);
  const [selectedBackdropId, setSelectedBackdropId] = useState<string | null>(null);
  const [backdropImageUrl, setBackdropImageUrl] = useState<string | null>(null);

  // Video editor
  const [showVideoEditor, setShowVideoEditor] = useState(false);
  const [editBlob, setEditBlob] = useState<Blob | null>(null);

  // Annotation layer
  const [showAnnotations, setShowAnnotations] = useState(false);

  // Cover generator
  const [showCoverGenerator, setShowCoverGenerator] = useState(false);

  // Publish dashboard
  const [showPublishDashboard, setShowPublishDashboard] = useState(false);
  const [upgradeIntent, setUpgradeIntent] = useState<{
    feature: string;
    title: string;
    description: string;
  } | null>(null);

  const { virtualBgMode, setVirtualBgMode, setVirtualBgImageUrl } = useMeetingStore();
  const processedStream = useVirtualBackground(compositorOutput, {
    mode: virtualBgMode as BackgroundMode,
    imageUrl: backdropImageUrl || undefined,
    blurRadius: 12,
  });
  const displayStream = (virtualBgMode !== 'none' && processedStream) ? processedStream : compositorOutput;

  useEffect(() => {
    const updatePreviewBounds = () => {
      const container = previewRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      if (!rect.width || !rect.height) {
        setPreviewBounds(null);
        return;
      }

      const aspect = compositorState.canvasWidth / Math.max(compositorState.canvasHeight, 1);
      const containerAspect = rect.width / rect.height;
      let width = rect.width;
      let height = rect.height;
      let left = 0;
      let top = 0;

      if (containerAspect > aspect) {
        height = rect.height;
        width = height * aspect;
        left = (rect.width - width) / 2;
      } else {
        width = rect.width;
        height = width / aspect;
        top = (rect.height - height) / 2;
      }

      setPreviewBounds({ left, top, width, height });
    };

    updatePreviewBounds();
    const observer = new ResizeObserver(updatePreviewBounds);
    if (previewRef.current) {
      observer.observe(previewRef.current);
    }
    window.addEventListener('resize', updatePreviewBounds);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updatePreviewBounds);
    };
  }, [compositorState.canvasHeight, compositorState.canvasWidth]);

  // Onboarding wizard
  const [showOnboarding, setShowOnboarding] = useState(() => {
    try { return !localStorage.getItem('screenflow-onboarding-done'); } catch { return true; }
  });

  const [questions, setQuestions] = useState<Question[]>(() => {
    try { return JSON.parse(localStorage.getItem('screenflow-questions') || '[]'); } catch { return []; }
  });
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [performanceData, setPerformanceData] = useState<AnalysisMetric[]>([]);

  const lastAnalyzedLengthRef = useRef(0);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const useSpeechHook = config.useMockSpeechRecognition ? useMockSpeechRecognition : useSpeechRecognition;
  const { transcript, interimTranscript, startRecognition, stopRecognition, fullSessionText } = useSpeechHook(recorderState === RecorderState.RECORDING);

  const openUpgradeIntent = useCallback((feature: string, title: string, description: string) => {
    trackCommercialIntent('upgrade_click', {
      feature,
      plan: 'Pro',
      source: 'record_page',
    });
    setUpgradeIntent({ feature, title, description });
  }, []);

  // Init camera on mount
  useEffect(() => { initCamera(); }, [initCamera]);

  // Persist questions
  useEffect(() => {
    if (questions.length > 0) localStorage.setItem('screenflow-questions', JSON.stringify(questions));
  }, [questions]);

  // Create download URL and edit blob when finished
  useEffect(() => {
    if (recorderState === RecorderState.FINISHED && recordedChunks.length > 0) {
      createDownloadUrl();
      const mimeType = recordedChunks[0]?.type || 'video/webm';
      setEditBlob(new Blob(recordedChunks, { type: mimeType }));
    }
  }, [recorderState, recordedChunks, createDownloadUrl]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    };
  }, []);

  // AI trigger
  const triggerAI = useCallback(async () => {
    if (fullSessionText.length - lastAnalyzedLengthRef.current < config.aiTriggerThreshold) return;
    if (isAiProcessing) return;

    setIsAiProcessing(true);
    try {
      const recentContext = fullSessionText.slice(-400);
      const result = await aiApi.generateQuestion(recentContext, 'professional');
      if (result?.text) {
        setQuestions((prev) => [...prev, { id: crypto.randomUUID(), text: result.text, category: result.category || 'support', timestamp: Date.now() }]);
      }
      lastAnalyzedLengthRef.current = fullSessionText.length;

      if (fullSessionText.length > 200 && fullSessionText.length % 500 < 50) {
        const perf = await aiApi.analyzePerformance(fullSessionText.slice(-500));
        if (Array.isArray(perf)) setPerformanceData(perf);
      }
    } catch (e) {
      lastAnalyzedLengthRef.current = fullSessionText.length;
    } finally {
      setIsAiProcessing(false);
    }
  }, [fullSessionText, isAiProcessing]);

  // Watch transcript for AI triggers
  useEffect(() => {
    if (recorderState !== RecorderState.RECORDING || isAiProcessing) return;
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);

    const newTextLength = fullSessionText.length - lastAnalyzedLengthRef.current;
    if (newTextLength < config.aiTriggerThreshold) return;

    if (newTextLength >= 50) {
      triggerAI();
    } else {
      silenceTimerRef.current = setTimeout(() => {
        if (fullSessionText.length - lastAnalyzedLengthRef.current >= config.aiTriggerThreshold) triggerAI();
      }, config.silenceTimeout);
    }
    return () => { if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current); };
  }, [transcript, fullSessionText, recorderState, isAiProcessing, triggerAI]);

  const handleStartRecording = () => {
    if (!stream) return;
    const recordingStream = displayStream || stream;
    const success = startRecording(recordingStream, setError);
    if (success) {
      startVisualization(recordingStream);
      startRecognition();
      setQuestions([]);
      lastAnalyzedLengthRef.current = 0;
    }
  };

  const handleStopRecording = () => {
    stopRecording();
    stopRecognition();
    stopVisualization();
    if (fullSessionText.length > 50) {
      aiApi.analyzePerformance(fullSessionText).then((data) => {
        if (Array.isArray(data)) setPerformanceData(data);
      }).catch(() => {});
    }
  };

  const startPiPDrag = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (!previewBounds || recorderState === RecorderState.RECORDING) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragStateRef.current = {
      type: 'pip',
      startX: event.clientX,
      startY: event.clientY,
      startOffsetX: pipPosition.x,
      startOffsetY: pipPosition.y,
    };
  }, [pipPosition.x, pipPosition.y, previewBounds, recorderState]);

  const startDividerDrag = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (!previewBounds || recorderState === RecorderState.RECORDING) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragStateRef.current = {
      type: 'divider',
      rectLeft: previewBounds.left,
      rectWidth: previewBounds.width,
    };
  }, [previewBounds, recorderState]);

  const handleOverlayPointerMove = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    const dragState = dragStateRef.current;
    if (!dragState) return;

    if (dragState.type === 'pip') {
      const scaleX = compositorState.canvasWidth / Math.max(previewBounds?.width || 1, 1);
      const scaleY = compositorState.canvasHeight / Math.max(previewBounds?.height || 1, 1);
      const deltaX = (dragState.startX - event.clientX) * scaleX;
      const deltaY = (dragState.startY - event.clientY) * scaleY;
      setPipPosition({
        x: Math.max(dragState.startOffsetX + deltaX, 0),
        y: Math.max(dragState.startOffsetY + deltaY, 0),
      });
      return;
    }

    if (dragState.type === 'divider') {
      const localX = event.clientX - dragState.rectLeft;
      const nextRatio = localX / Math.max(dragState.rectWidth, 1);
      setSideBySideRatio(Math.min(Math.max(nextRatio, 0.2), 0.5));
    }
  }, [compositorState.canvasHeight, compositorState.canvasWidth, previewBounds]);

  const stopOverlayDrag = useCallback((event?: React.PointerEvent<HTMLDivElement>) => {
    dragStateRef.current = null;
    if (event?.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
        e.preventDefault();
        if (recorderState === RecorderState.IDLE || recorderState === RecorderState.FINISHED) {
          if (!error && stream) handleStartRecording();
        } else if (recorderState === RecorderState.RECORDING) {
          handleStopRecording();
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
        e.preventDefault();
        if (downloadUrl) downloadVideo();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 't') {
        e.preventDefault();
        if (recorderState === RecorderState.RECORDING) {
          teleprompter.toggleVisibility();
        }
      }
      if ((e.ctrlKey || e.metaKey) && recorderState !== RecorderState.RECORDING) {
        if (e.key === '1') { e.preventDefault(); switchMediaSource('screen'); setLayoutMode('screen-only'); }
        if (e.key === '2') { e.preventDefault(); switchMediaSource('camera'); setLayoutMode('camera-only'); }
        if (e.key === '3') { e.preventDefault(); switchMediaSource('both'); setLayoutMode('pip'); }
      }
      // Layout shortcuts (Ctrl+Shift+1..5)
      if ((e.ctrlKey || e.metaKey) && e.shiftKey) {
        if (e.key === '1') { e.preventDefault(); setLayoutMode('camera-only'); }
        if (e.key === '2' && screenStream) { e.preventDefault(); setLayoutMode('screen-only'); }
        if (e.key === '3' && cameraStream && screenStream) { e.preventDefault(); setLayoutMode('pip'); }
        if (e.key === '4' && cameraStream && screenStream) { e.preventDefault(); setLayoutMode('side-by-side'); }
        if (e.key === '5' && cameraStream && screenStream) { e.preventDefault(); setLayoutMode('floating-camera'); }
      }
    };
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [cameraStream, downloadUrl, error, recorderState, screenStream, stream, switchMediaSource, teleprompter]);

  // Backdrop handlers
  const handleBackdropSelect = useCallback((imageUrl: string | null) => {
    if (!imageUrl) {
      setVirtualBgMode('none');
      setVirtualBgImageUrl(null);
      setBackdropImageUrl(null);
      setSelectedBackdropId('none');
    } else {
      setVirtualBgMode('image');
      setVirtualBgImageUrl(imageUrl);
      setBackdropImageUrl(imageUrl);
      setSelectedBackdropId(imageUrl);
    }
  }, [setVirtualBgMode, setVirtualBgImageUrl]);

  // Subtitle export handlers
  const handleExportSRT = useCallback(() => {
    if (!fullSessionText || recordingDuration <= 0) return;
    openUpgradeIntent('subtitle_export_srt', '字幕导出属于 Pro 功能', '升级后可以把录制转写导出为 SRT 字幕，用于剪映、Premiere、B 站和课程平台。');
    return;
    const lang = config.speechLanguage || 'en-US';
    const segments = splitTextIntoSegments(fullSessionText, recordingDuration * 1000, lang);
    const srt = transcriptToSRT(segments);
    downloadFile(srt, `recording-${Date.now()}.srt`, 'text/plain');
  }, [fullSessionText, openUpgradeIntent, recordingDuration]);

  const handleExportVTT = useCallback(() => {
    if (!fullSessionText || recordingDuration <= 0) return;
    openUpgradeIntent('subtitle_export_vtt', '字幕导出属于 Pro 功能', '升级后可以把字幕导出为 VTT，便于上传到网站、课程平台或企业知识库。');
    return;
    const lang = config.speechLanguage || 'en-US';
    const segments = splitTextIntoSegments(fullSessionText, recordingDuration * 1000, lang);
    const vtt = transcriptToVTT(segments);
    downloadFile(vtt, `recording-${Date.now()}.vtt`, 'text/vtt');
  }, [fullSessionText, openUpgradeIntent, recordingDuration]);

  // Onboarding handlers
  const handleOnboardingComplete = useCallback((source: MediaSourceType, backdropUrl: string | null) => {
    switchMediaSource(source);
    if (backdropUrl) handleBackdropSelect(backdropUrl);
    localStorage.setItem('screenflow-onboarding-done', 'true');
    setShowOnboarding(false);
  }, [switchMediaSource, handleBackdropSelect]);

  const handleOnboardingSkip = useCallback(() => {
    localStorage.setItem('screenflow-onboarding-done', 'true');
    setShowOnboarding(false);
  }, []);

  return (
    <div className={`flex flex-col h-screen font-sans selection:bg-indigo-500/30 ${theme === 'dark' ? 'bg-gray-950 text-white' : 'bg-gray-50 text-gray-900'}`}>
      {/* Header */}
      <header className={`h-16 border-b backdrop-blur flex items-center justify-between px-4 sm:px-6 shrink-0 z-20 ${theme === 'dark' ? 'border-gray-800 bg-gray-900/50' : 'border-gray-200 bg-white/50'}`}>
          <div className="flex items-center gap-3">
          <button onClick={() => navigate('/')} className="p-2 rounded-md text-gray-400 hover:text-white hover:bg-gray-800 transition-colors" aria-label="Back to home">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="bg-indigo-600 p-2 rounded-lg"><Settings2 className="w-5 h-5 text-white" /></div>
          <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-cyan-400">ScreenFlow AI</h1>
          <button
            onClick={() => navigate('/pricing')}
            className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-1 text-xs font-semibold text-cyan-200 hover:bg-cyan-500/20"
          >
            <Crown className="h-3.5 w-3.5" />
            Pro 内测
          </button>
          {config.useMockSpeechRecognition && <span className="px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-400 text-xs font-semibold">MOCK</span>}
        </div>
        <div className="flex items-center gap-2 sm:gap-4">
          <button onClick={toggleTheme} className={`p-2 rounded-md transition-all ${theme === 'dark' ? 'text-gray-400 hover:text-white hover:bg-gray-800' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'}`} aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}>
            {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
          <div className="relative">
            <TeleprompterSettings
              script={teleprompter.script}
              onScriptChange={teleprompter.setScript}
              onClear={teleprompter.reset}
              isOpen={showTeleprompterSettings}
              onToggle={() => setShowTeleprompterSettings((v) => !v)}
            />
          </div>
          <button
            onClick={() => setShowBackdropLibrary(true)}
            className={`p-2 rounded-md transition-all ${showBackdropLibrary ? 'bg-indigo-600 text-white' : theme === 'dark' ? 'text-gray-400 hover:text-white hover:bg-gray-800' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'}`}
            title="Backgrounds"
          >
            <Image className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowAnnotations(!showAnnotations)}
            className={`p-2 rounded-md transition-all ${showAnnotations ? 'bg-indigo-600 text-white' : theme === 'dark' ? 'text-gray-400 hover:text-white hover:bg-gray-800' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'}`}
            title={t('annotation.tools.pen')}
          >
            <Pencil className="w-4 h-4" />
          </button>
          <KeyboardShortcuts theme={theme} />
          <LayoutSelector
            currentLayout={layoutMode}
            onLayoutChange={setLayoutMode}
            hasScreen={mediaSource === 'screen' || mediaSource === 'both'}
            hasCamera={!!cameraStream}
            theme={theme}
            disabled={recorderState === RecorderState.RECORDING}
          />
          {/* PiP position nudge */}
          {(layoutMode === 'pip' || layoutMode === 'floating-camera') && compositorState.isCompositing && (
            <div className={`hidden sm:flex rounded-lg p-0.5 border gap-px ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-gray-100 border-gray-300'}`}>
              <button onClick={() => setPipPosition((p) => ({ ...p, y: Math.min(p.y + 20, 200) }))} className={`p-1 rounded ${theme === 'dark' ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'}`} title="Move down"><ChevronDown className="w-3.5 h-3.5" /></button>
              <button onClick={() => setPipPosition((p) => ({ ...p, y: Math.max(p.y - 20, 0) }))} className={`p-1 rounded ${theme === 'dark' ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'}`} title="Move up"><ChevronUp className="w-3.5 h-3.5" /></button>
              <button onClick={() => setPipPosition((p) => ({ ...p, x: Math.min(p.x + 20, 200) }))} className={`p-1 rounded ${theme === 'dark' ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'}`} title="Move left"><ChevronLeft className="w-3.5 h-3.5" /></button>
              <button onClick={() => setPipPosition((p) => ({ ...p, x: Math.max(p.x - 20, 0) }))} className={`p-1 rounded ${theme === 'dark' ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'}`} title="Move right"><ChevronRight className="w-3.5 h-3.5" /></button>
            </div>
          )}
          {/* Side-by-side ratio slider */}
          {layoutMode === 'side-by-side' && compositorState.isCompositing && (
            <div className={`hidden sm:flex items-center gap-1.5 rounded-lg px-2 py-1 border ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-gray-100 border-gray-300'}`}>
              <span className="text-[10px] text-gray-400">{t('layout.camera-only')}</span>
              <input
                type="range"
                min={20}
                max={50}
                step={1}
                value={Math.round(sideBySideRatio * 100)}
                onChange={(e) => setSideBySideRatio(Number(e.target.value) / 100)}
                className="w-16 h-1 accent-indigo-500"
                title="Camera ratio"
              />
              <span className="text-[10px] text-gray-400">{t('layout.screen-only')}</span>
            </div>
          )}
          <div className={`hidden sm:flex rounded-lg p-1 border ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-gray-100 border-gray-300'}`} role="group" aria-label="Media source selector">
            {([['screen', Monitor], ['camera', Camera], ['both', null]] as const).map(([type, Icon]) => {
              const handleSourceChange = () => {
                const src = type as MediaSourceType;
                switchMediaSource(src);
                setLayoutMode(detectBestLayout(src));
              };
              return (
                <button key={type} onClick={handleSourceChange} className={`p-2 rounded-md transition-all ${mediaSource === type ? 'bg-indigo-600 text-white shadow-lg' : theme === 'dark' ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`} title={`${type} (Ctrl+${type === 'screen' ? '1' : type === 'camera' ? '2' : '3'})`} disabled={recorderState === RecorderState.RECORDING}>
                  {type === 'both' ? <div className="flex"><Monitor className="w-4 h-4 -mr-1" /><Camera className="w-4 h-4 -ml-1 mt-1" /></div> : Icon && <Icon className="w-4 h-4" />}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden flex flex-col md:flex-row p-4 sm:p-6 gap-4 sm:gap-6 relative">
        <section className="flex-[2] flex flex-col gap-4 sm:gap-6 min-h-0">
          <div ref={previewRef} className="flex-1 min-h-0 relative">
            <Recorder stream={displayStream} error={error} mediaSource={mediaSource} isRecording={recorderState === RecorderState.RECORDING} />
            <AnnotationLayer
              isVisible={showAnnotations}
              theme={theme}
            />
            {previewBounds && compositorState.isCompositing && (
              <div
                className="absolute inset-0 z-10"
                onPointerMove={handleOverlayPointerMove}
                onPointerUp={stopOverlayDrag}
                onPointerCancel={stopOverlayDrag}
              >
                {(layoutMode === 'pip' || layoutMode === 'floating-camera') && (
                  <div
                    className="absolute cursor-move rounded-xl border border-dashed border-cyan-300/80 bg-cyan-400/10 backdrop-blur-[1px]"
                    style={{
                      left: previewBounds.left + previewBounds.width * 0.72,
                      top: previewBounds.top + previewBounds.height * 0.68,
                      width: previewBounds.width * (layoutMode === 'pip' ? 0.22 : 0.18),
                      height: previewBounds.height * (layoutMode === 'pip' ? 0.22 : 0.18),
                      transform: `translate(${-pipPosition.x * (previewBounds.width / Math.max(compositorState.canvasWidth, 1))}px, ${-pipPosition.y * (previewBounds.height / Math.max(compositorState.canvasHeight, 1))}px)`,
                      borderRadius: layoutMode === 'floating-camera' ? '999px' : '16px',
                    }}
                    onPointerDown={startPiPDrag}
                    title={t('layout.dragPip')}
                  >
                    <div className="absolute inset-0 flex items-center justify-center text-[10px] font-medium text-cyan-100">
                      {t('layout.dragPip')}
                    </div>
                  </div>
                )}
                {layoutMode === 'side-by-side' && (
                  <div
                    className="absolute top-0 bottom-0 w-3 -ml-1.5 cursor-col-resize"
                    style={{
                      left: previewBounds.left + previewBounds.width * sideBySideRatio,
                      top: previewBounds.top,
                      height: previewBounds.height,
                    }}
                    onPointerDown={startDividerDrag}
                    title={t('layout.dragDivider')}
                  >
                    <div className="mx-auto h-full w-1 rounded-full bg-cyan-300/80 shadow-[0_0_0_1px_rgba(6,182,212,0.4)]" />
                  </div>
                )}
              </div>
            )}
            <Teleprompter
              sentences={teleprompter.sentences}
              currentIndex={teleprompter.currentIndex}
              isPlaying={teleprompter.isPlaying}
              isPaused={teleprompter.isPaused}
              fontSize={teleprompter.fontSize}
              speed={teleprompter.speed}
              isVisible={teleprompter.isVisible}
              onStart={teleprompter.start}
              onPause={teleprompter.pause}
              onResume={teleprompter.resume}
              onStop={teleprompter.stop}
              onFontSizeChange={teleprompter.setFontSize}
              onSpeedChange={teleprompter.setSpeed}
              onToggleVisibility={teleprompter.toggleVisibility}
            />
            {(transcript || interimTranscript) && (
              <div className="absolute bottom-4 left-4 right-4 p-3 bg-black/60 backdrop-blur-md rounded-xl border border-white/10 text-center pointer-events-none">
                <p className="text-gray-300 text-sm sm:text-lg font-light leading-relaxed">
                  <span className="opacity-70">{transcript.slice(-100)}</span>
                  <span className="text-white font-medium">{interimTranscript}</span>
                </p>
              </div>
            )}
            {/* Layout indicator */}
            {compositorState.isCompositing && (
              <div className="absolute top-4 left-4 px-2.5 py-1 bg-black/50 backdrop-blur-sm rounded-lg border border-white/10 pointer-events-none">
                <span className="text-white/60 text-xs font-medium">{t(`layout.${layoutMode}`)}</span>
              </div>
            )}
          </div>

          <div className={`h-20 sm:h-24 rounded-xl flex items-center justify-between px-4 sm:px-8 shrink-0 ${theme === 'dark' ? 'bg-gray-900/50 border border-gray-800' : 'bg-white border border-gray-200'}`}>
            <div className="flex items-center gap-4 sm:gap-6">
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${recorderState === RecorderState.RECORDING ? 'bg-red-500 animate-pulse' : 'bg-gray-600'}`} />
                <span className="text-gray-400 font-mono text-xs sm:text-sm">{recorderState === RecorderState.RECORDING ? t('recording.rec') : t('recording.ready')}</span>
              </div>
              {recorderState === RecorderState.RECORDING && (
                <>
                  <span className="text-white font-mono text-sm sm:text-lg font-bold">{formatDuration(recordingDuration)}</span>
                  <div className="hidden sm:flex items-center gap-2">
                    <Mic className="w-4 h-4 text-gray-500" />
                    <div className="w-24 h-2 bg-gray-700 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-green-500 to-cyan-500 transition-all duration-100" style={{ width: `${audioLevel}%` }} />
                    </div>
                  </div>
                </>
              )}
            </div>
            <div className="flex gap-2 sm:gap-4">
              {recorderState === RecorderState.IDLE || recorderState === RecorderState.FINISHED ? (
                <button onClick={handleStartRecording} disabled={!!error || !stream} className={`flex items-center gap-2 px-4 sm:px-8 py-2 sm:py-3 rounded-full font-bold shadow-lg transition-all text-sm sm:text-base ${error || !stream ? 'bg-gray-700 text-gray-400 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700 text-white shadow-red-900/20 hover:scale-105'}`}>
                  <Play className="w-4 h-4 sm:w-5 sm:h-5 fill-current" /> <span className="hidden sm:inline">{t('common.start')}</span>
                </button>
              ) : (
                <button onClick={handleStopRecording} className="flex items-center gap-2 bg-gray-700 hover:bg-gray-600 text-white px-4 sm:px-8 py-2 sm:py-3 rounded-full font-bold transition-all border border-gray-600 text-sm sm:text-base">
                  <Square className="w-4 h-4 sm:w-5 sm:h-5 fill-current" /> {t('common.stop')}
                </button>
              )}
            </div>
            <div className="flex justify-end gap-2">
              {downloadUrl && (
                <>
                  <button onClick={() => openUpgradeIntent('video_editor', '视频剪辑属于 Pro 功能', '升级后可以裁剪录制片段、添加背景音乐、烧录字幕并导出成品视频。')} className="text-cyan-400 hover:text-cyan-300 flex flex-col items-center gap-1 text-xs" title={t('editor.title')}>
                    <Film className="w-5 h-5 sm:w-6 sm:h-6" /> {t('editor.edit')}
                  </button>
                  <button onClick={() => openUpgradeIntent('cover_generator', 'AI 封面生成属于 Pro 功能', '升级后可以基于录制视频快速生成课程封面、培训封面和社媒封面。')} className="text-purple-400 hover:text-purple-300 flex flex-col items-center gap-1 text-xs" title="Generate Cover">
                    <Image className="w-5 h-5 sm:w-6 sm:h-6" /> Cover
                  </button>
                  <button onClick={() => openUpgradeIntent('social_publish', '多平台发布属于 Pro 功能', '升级后可以把录制内容整理为发布素材，并追踪创作者和培训团队的发布需求。')} className="text-green-400 hover:text-green-300 flex flex-col items-center gap-1 text-xs" title="Publish to Social Media">
                    <Upload className="w-5 h-5 sm:w-6 sm:h-6" /> Publish
                  </button>
                  <button onClick={downloadVideo} className="text-indigo-400 hover:text-indigo-300 flex flex-col items-center gap-1 text-xs" title={t('recording.download')}>
                    <Download className="w-5 h-5 sm:w-6 sm:h-6" /> {t('recording.save')}
                  </button>
                </>
              )}
            </div>
          </div>
        </section>

        <aside className="flex-1 md:max-w-md flex flex-col gap-4 sm:gap-6 min-h-0">
          <div className="flex-1 min-h-0"><QuestionPanel questions={questions} isProcessing={isAiProcessing} /></div>
          <div className={`h-1/3 rounded-xl p-4 flex flex-col ${theme === 'dark' ? 'bg-gray-900/50 border border-gray-800' : 'bg-white border border-gray-200'}`}>
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-sm font-semibold text-gray-400">{t('recording.analysis')}</h3>
              <span className="text-xs text-green-500">{t('recording.active')}</span>
            </div>
            <div className="flex-1 relative">
              {performanceData.length > 0 ? <PerformanceChart data={performanceData} /> : <div className="absolute inset-0 flex items-center justify-center text-gray-600 text-sm">{t('recording.speakToGenerate')}</div>}
            </div>
          </div>
        </aside>
      </main>

      <BackdropLibrary
        isOpen={showBackdropLibrary}
        onClose={() => setShowBackdropLibrary(false)}
        onSelect={handleBackdropSelect}
        selectedId={selectedBackdropId}
        theme={theme}
      />

      <OnboardingWizard
        isOpen={showOnboarding}
        onComplete={handleOnboardingComplete}
        onSkip={handleOnboardingSkip}
        mediaSource={mediaSource}
        theme={theme}
      />

      <Suspense fallback={null}>
        <VideoEditor
          isOpen={showVideoEditor}
          onClose={() => setShowVideoEditor(false)}
          sourceBlob={editBlob}
          fullSessionText={fullSessionText}
          subtitleLanguage={config.speechLanguage}
          theme={theme}
        />
      </Suspense>

      <CoverGenerator
        isOpen={showCoverGenerator}
        onClose={() => setShowCoverGenerator(false)}
        videoBlob={editBlob}
        theme={theme}
      />

      <PublishDashboard
        isOpen={showPublishDashboard}
        onClose={() => setShowPublishDashboard(false)}
        videoBlob={editBlob}
        theme={theme}
      />

      <Modal
        isOpen={!!upgradeIntent}
        onClose={() => setUpgradeIntent(null)}
        title={upgradeIntent?.title || '升级 Pro'}
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-xl border border-indigo-500/30 bg-indigo-500/10 p-4">
            <div className="rounded-lg bg-indigo-600 p-2">
              <Lock className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-sm leading-6 text-gray-300">{upgradeIntent?.description}</p>
              <p className="mt-2 text-xs text-gray-500">这次点击已记录为付费意向，用于判断哪些 Pro 功能最值得优先开发和开放。</p>
            </div>
          </div>
          <div className="flex gap-3">
            <Button className="flex-1" onClick={() => navigate('/pricing')}>
              查看 Pro 内测
            </Button>
            <Button className="flex-1" variant="secondary" onClick={() => setUpgradeIntent(null)}>
              稍后再说
            </Button>
          </div>
        </div>
      </Modal>

      {/* Subtitle export floating bar */}
      {recorderState === RecorderState.FINISHED && fullSessionText.length > 10 && (
        <div className={`fixed bottom-8 left-1/2 -translate-x-1/2 rounded-xl px-4 py-2 shadow-xl flex items-center gap-3 z-30 ${theme === 'dark' ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}>
          <span className="text-xs text-gray-400">{t('subtitles.export.title')}:</span>
          <button onClick={handleExportSRT} className="text-xs px-2 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md transition-colors">SRT</button>
          <button onClick={handleExportVTT} className="text-xs px-2 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md transition-colors">VTT</button>
        </div>
      )}
    </div>
  );
};
