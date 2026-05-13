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

export const useSpeechRecognition = (isRecording: boolean, language: string = 'en-US', t: (key: string) => string = (k) => k) => {
  const [transcript, setTranscript] = useState<string>('');
  const [interimTranscript, setInterimTranscript] = useState<string>('');
  const [fullSessionText, setFullSessionText] = useState<string>('');
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const isRecordingRef = useRef(isRecording);
  const tRef = useRef(t);

  useEffect(() => { isRecordingRef.current = isRecording; }, [isRecording]);
  useEffect(() => { tRef.current = t; }, [t]);

  useEffect(() => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      console.error('Speech Recognition not supported in this browser.');
      return;
    }

    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = language;

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
        setTranscript((prev) => {
          const newFull = prev + final;
          setFullSessionText(newFull);
          return newFull;
        });
      }
      setInterimTranscript(interim);
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      if (event.error === 'not-allowed') {
        alert(tRef.current('subtitles.micDeniedTip'));
      }
    };

    // Auto-restart if it stops unexpectedly while recording
    recognition.onend = () => {
      if (isRecordingRef.current) {
        try {
          recognition.start();
        } catch (e) {
          // ignore already started errors
        }
      }
    };

    recognitionRef.current = recognition;

    return () => {
      try {
        recognitionRef.current?.stop();
      } catch (e) {
        // ignore
      }
      recognitionRef.current = null;
    };
  }, [language]);

  const startRecognition = useCallback(() => {
    setTranscript('');
    setInterimTranscript('');
    setFullSessionText('');
    try {
      recognitionRef.current?.start();
    } catch (e) {
      // ignore already started errors
    }
  }, []);

  const stopRecognition = useCallback(() => {
    try {
      recognitionRef.current?.stop();
    } catch (e) {
      console.error('Failed to stop recognition', e);
    }
  }, []);

  return {
    transcript,
    interimTranscript,
    startRecognition,
    stopRecognition,
    fullSessionText,
  };
};
