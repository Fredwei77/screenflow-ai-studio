import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { RecorderState, Question, AnalysisMetric, type MediaSourceType } from '../types';
import Recorder from '../components/Recorder';
import QuestionPanel from '../components/QuestionPanel';
import PerformanceChart from '../components/PerformanceChart';
import KeyboardShortcuts from '../components/KeyboardShortcuts';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { useMockSpeechRecognition } from '../hooks/useMockSpeechRecognition';
import { useMediaStream } from '../hooks/useMediaStream';
import { useRecording } from '../hooks/useRecording';
import { useAudioLevel } from '../hooks/useAudioLevel';
import { useTheme } from '../hooks/useTheme';
import { aiApi } from '../services/api';
import { config } from '../config';
import { formatDuration } from '../lib/formatters';
import { Mic, Monitor, Camera, Square, Play, Download, Settings2, Moon, Sun, ArrowLeft } from 'lucide-react';

export const RecordPage: React.FC = () => {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { stream, mediaSource, error, setError, switchMediaSource, initCamera } = useMediaStream();
  const { recorderState, setRecorderState, downloadUrl, recordingDuration, startRecording, stopRecording, downloadVideo, createDownloadUrl, recordedChunks } = useRecording();
  const { audioLevel, startVisualization, stopVisualization } = useAudioLevel();

  const [questions, setQuestions] = useState<Question[]>(() => {
    try { return JSON.parse(localStorage.getItem('screenflow-questions') || '[]'); } catch { return []; }
  });
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [performanceData, setPerformanceData] = useState<AnalysisMetric[]>([]);

  const lastAnalyzedLengthRef = useRef(0);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const useSpeechHook = config.useMockSpeechRecognition ? useMockSpeechRecognition : useSpeechRecognition;
  const { transcript, interimTranscript, startRecognition, stopRecognition, fullSessionText } = useSpeechHook(recorderState === RecorderState.RECORDING);

  // Init camera on mount
  useEffect(() => { initCamera(); }, [initCamera]);

  // Persist questions
  useEffect(() => {
    if (questions.length > 0) localStorage.setItem('screenflow-questions', JSON.stringify(questions));
  }, [questions]);

  // Create download URL when finished
  useEffect(() => {
    if (recorderState === RecorderState.FINISHED && recordedChunks.length > 0) {
      createDownloadUrl();
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
    const success = startRecording(stream, setError);
    if (success) {
      startVisualization(stream);
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
      if ((e.ctrlKey || e.metaKey) && recorderState !== RecorderState.RECORDING) {
        if (e.key === '1') { e.preventDefault(); switchMediaSource('screen'); }
        if (e.key === '2') { e.preventDefault(); switchMediaSource('camera'); }
        if (e.key === '3') { e.preventDefault(); switchMediaSource('both'); }
      }
    };
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [recorderState, error, stream, downloadUrl, switchMediaSource]);

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
          {config.useMockSpeechRecognition && <span className="px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-400 text-xs font-semibold">MOCK</span>}
        </div>
        <div className="flex items-center gap-2 sm:gap-4">
          <button onClick={toggleTheme} className={`p-2 rounded-md transition-all ${theme === 'dark' ? 'text-gray-400 hover:text-white hover:bg-gray-800' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'}`} aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}>
            {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
          <KeyboardShortcuts theme={theme} />
          <div className={`hidden sm:flex rounded-lg p-1 border ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-gray-100 border-gray-300'}`} role="group" aria-label="Media source selector">
            {([['screen', Monitor], ['camera', Camera], ['both', null]] as const).map(([type, Icon]) => (
              <button key={type} onClick={() => switchMediaSource(type as MediaSourceType)} className={`p-2 rounded-md transition-all ${mediaSource === type ? 'bg-indigo-600 text-white shadow-lg' : theme === 'dark' ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`} title={`${type} (Ctrl+${type === 'screen' ? '1' : type === 'camera' ? '2' : '3'})`} disabled={recorderState === RecorderState.RECORDING}>
                {type === 'both' ? <div className="flex"><Monitor className="w-4 h-4 -mr-1" /><Mic className="w-4 h-4 -ml-1 mt-1" /></div> : Icon && <Icon className="w-4 h-4" />}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden flex flex-col md:flex-row p-4 sm:p-6 gap-4 sm:gap-6 relative">
        <section className="flex-[2] flex flex-col gap-4 sm:gap-6 min-h-0">
          <div className="flex-1 min-h-0 relative">
            <Recorder stream={stream} error={error} mediaSource={mediaSource} isRecording={recorderState === RecorderState.RECORDING} />
            {(transcript || interimTranscript) && (
              <div className="absolute bottom-4 left-4 right-4 p-3 bg-black/60 backdrop-blur-md rounded-xl border border-white/10 text-center pointer-events-none">
                <p className="text-gray-300 text-sm sm:text-lg font-light leading-relaxed">
                  <span className="opacity-70">{transcript.slice(-100)}</span>
                  <span className="text-white font-medium">{interimTranscript}</span>
                </p>
              </div>
            )}
          </div>

          <div className={`h-20 sm:h-24 rounded-xl flex items-center justify-between px-4 sm:px-8 shrink-0 ${theme === 'dark' ? 'bg-gray-900/50 border border-gray-800' : 'bg-white border border-gray-200'}`}>
            <div className="flex items-center gap-4 sm:gap-6">
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${recorderState === RecorderState.RECORDING ? 'bg-red-500 animate-pulse' : 'bg-gray-600'}`} />
                <span className="text-gray-400 font-mono text-xs sm:text-sm">{recorderState === RecorderState.RECORDING ? 'REC' : 'READY'}</span>
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
                  <Play className="w-4 h-4 sm:w-5 sm:h-5 fill-current" /> <span className="hidden sm:inline">Start</span>
                </button>
              ) : (
                <button onClick={handleStopRecording} className="flex items-center gap-2 bg-gray-700 hover:bg-gray-600 text-white px-4 sm:px-8 py-2 sm:py-3 rounded-full font-bold transition-all border border-gray-600 text-sm sm:text-base">
                  <Square className="w-4 h-4 sm:w-5 sm:h-5 fill-current" /> Stop
                </button>
              )}
            </div>
            <div className="w-16 sm:w-32 flex justify-end">
              {downloadUrl && (
                <button onClick={downloadVideo} className="text-indigo-400 hover:text-indigo-300 flex flex-col items-center gap-1 text-xs" title="Download (Ctrl+D)">
                  <Download className="w-5 h-5 sm:w-6 sm:h-6" /> Save
                </button>
              )}
            </div>
          </div>
        </section>

        <aside className="flex-1 md:max-w-md flex flex-col gap-4 sm:gap-6 min-h-0">
          <div className="flex-1 min-h-0"><QuestionPanel questions={questions} isProcessing={isAiProcessing} /></div>
          <div className={`h-1/3 rounded-xl p-4 flex flex-col ${theme === 'dark' ? 'bg-gray-900/50 border border-gray-800' : 'bg-white border border-gray-200'}`}>
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-sm font-semibold text-gray-400">Analysis</h3>
              <span className="text-xs text-green-500">Active</span>
            </div>
            <div className="flex-1 relative">
              {performanceData.length > 0 ? <PerformanceChart data={performanceData} /> : <div className="absolute inset-0 flex items-center justify-center text-gray-600 text-sm">Speak to generate...</div>}
            </div>
          </div>
        </aside>
      </main>
    </div>
  );
};
