export const config = {
  useMockSpeechRecognition: false,
  speechLanguage: 'auto',
  aiTriggerThreshold: 80,
  silenceTimeout: 2000,
  debugMode: true,
  aiModel: 'meta-llama/llama-3.1-8b-instruct:free',
  maxParticipants: 4,
};

export const getConfigStatus = () => ({
  mode: config.useMockSpeechRecognition ? 'MOCK' : 'REAL',
  language: config.speechLanguage,
  aiThreshold: `${config.aiTriggerThreshold} chars`,
  silenceTimeout: `${config.silenceTimeout}ms`,
  debug: config.debugMode ? 'ON' : 'OFF',
  maxParticipants: config.maxParticipants,
});
