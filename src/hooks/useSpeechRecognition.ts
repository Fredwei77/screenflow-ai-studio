import { useState, useEffect, useRef, useCallback } from 'react';

// Polyfill for types
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: (event: SpeechRecognitionEvent) => void;
  onerror: (event: Event) => void;
  onend: (event: Event) => void;
}

declare global {
  interface Window {
    SpeechRecognition: { new (): SpeechRecognition };
    webkitSpeechRecognition: { new (): SpeechRecognition };
  }
}

export const useSpeechRecognition = (isRecording: boolean) => {
  const [transcript, setTranscript] = useState<string>('');
  const [interimTranscript, setInterimTranscript] = useState<string>('');
  const [fullSessionText, setFullSessionText] = useState<string>('');
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  useEffect(() => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      console.error("❌ Speech Recognition not supported in this browser.");
      alert("语音识别不支持！请使用 Chrome 或 Edge 浏览器。");
      return;
    }

    console.log('✅ Speech Recognition is supported');
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    console.log('✅ Speech Recognition initialized');

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let final = '';
      let interim = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          final += event.results[i][0].transcript + ' ';
        } else {
          interim += event.results[i][0].transcript;
        }
      }

      if (final) {
        console.log('🎤 Final transcript:', final);
        setTranscript((prev) => {
          const newFull = prev + final;
          setFullSessionText(newFull);
          return newFull;
        });
      }
      if (interim) {
        console.log('🎤 Interim transcript:', interim);
      }
      setInterimTranscript(interim);
    };

    recognition.onerror = (event: any) => {
      console.error("❌ Speech recognition error:", event.error, event.message);
      
      if (event.error === 'network') {
        console.error('❌ 网络错误：无法连接到语音识别服务');
        console.log('💡 提示：语音识别需要网络连接到 Google 服务器');
        console.log('💡 如果在中国大陆，可能需要使用 VPN 或其他网络');
      } else if (event.error === 'not-allowed') {
        console.error('❌ 麦克风权限被拒绝');
        alert('请允许麦克风权限！');
      } else if (event.error === 'no-speech') {
        console.warn('⚠️ 未检测到语音，请大声说话');
      }
    };
    
    // Auto-restart if it stops unexpectedly while recording
    recognition.onend = () => {
      if (isRecording) {
        try {
          recognition.start();
        } catch (e) {
          // ignore already started errors
        }
      }
    };

    recognitionRef.current = recognition;

    return () => {
        if (recognitionRef.current) {
            recognitionRef.current.stop();
        }
    }
  }, [isRecording]); // Re-init on recording state change if needed, though usually stable

  const startRecognition = useCallback(() => {
    console.log('🎙️ Starting speech recognition...');
    setTranscript('');
    setInterimTranscript('');
    setFullSessionText('');
    try {
      if (recognitionRef.current) {
        recognitionRef.current.start();
        console.log('✅ Speech recognition started');
      } else {
        console.error('❌ Speech recognition not initialized');
      }
    } catch (e) {
      console.error("❌ Failed to start recognition:", e);
    }
  }, []);

  const stopRecognition = useCallback(() => {
    try {
      recognitionRef.current?.stop();
    } catch (e) {
      console.error("Failed to stop recognition", e);
    }
  }, []);

  return {
    transcript,
    interimTranscript,
    startRecognition,
    stopRecognition,
    fullSessionText
  };
};
