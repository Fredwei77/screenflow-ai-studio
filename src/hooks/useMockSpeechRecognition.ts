import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Mock Speech Recognition for testing without network
 * 模拟语音识别，用于无网络环境测试
 */
export const useMockSpeechRecognition = (isRecording: boolean) => {
  const [transcript, setTranscript] = useState<string>('');
  const [interimTranscript, setInterimTranscript] = useState<string>('');
  const [fullSessionText, setFullSessionText] = useState<string>('');
  const intervalRef = useRef<any>(null);
  const textIndexRef = useRef(0);

  // 模拟的转录文本
  const mockTexts = [
    "Hello, this is a test of the speech recognition system.",
    "I am demonstrating how the AI co-pilot works.",
    "The system should generate questions based on what I say.",
    "This is a longer sentence to trigger the AI analysis.",
    "Let me talk about the features of this application.",
    "It can record video, transcribe speech, and generate AI questions.",
    "The performance analysis shows clarity, engagement, and structure.",
    "This is really helpful for content creators and presenters.",
  ];

  const startRecognition = useCallback(() => {
    console.log('🎙️ Starting MOCK speech recognition...');
    console.log('💡 Using mock data for testing (no network required)');
    setTranscript('');
    setInterimTranscript('');
    setFullSessionText('');
    textIndexRef.current = 0;
  }, []);

  const stopRecognition = useCallback(() => {
    console.log('🛑 Stopping MOCK speech recognition');
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // Simulate speech recognition when recording
  useEffect(() => {
    if (isRecording) {
      console.log('✅ MOCK recognition started');
      
      // Simulate speech every 3 seconds
      intervalRef.current = setInterval(() => {
        if (textIndexRef.current < mockTexts.length) {
          const text = mockTexts[textIndexRef.current];
          
          // Simulate interim results (word by word)
          const words = text.split(' ');
          let currentText = '';
          
          words.forEach((word, index) => {
            setTimeout(() => {
              currentText += word + ' ';
              setInterimTranscript(currentText);
              console.log('🎤 Interim:', currentText);
            }, index * 100);
          });

          // Set final result after all words
          setTimeout(() => {
            console.log('🎤 Final:', text);
            setTranscript((prev) => {
              const newFull = prev + text + ' ';
              setFullSessionText(newFull);
              return newFull;
            });
            setInterimTranscript('');
            textIndexRef.current++;
          }, words.length * 100 + 200);
        }
      }, 4000); // Every 4 seconds
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRecording]);

  return {
    transcript,
    interimTranscript,
    startRecognition,
    stopRecognition,
    fullSessionText
  };
};
