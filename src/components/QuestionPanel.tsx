import React, { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Question } from '../types';
import { MessageCircle, Zap, HelpCircle, Lightbulb, AlertCircle } from 'lucide-react';

interface QuestionPanelProps {
  questions: Question[];
  isProcessing: boolean;
}

const QuestionPanel: React.FC<QuestionPanelProps> = ({ questions, isProcessing }) => {
  const { t } = useTranslation();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [questions]);

  const getIcon = (category: string) => {
    switch (category) {
      case 'deep-dive': return <Zap className="w-4 h-4 text-yellow-400" />;
      case 'clarification': return <HelpCircle className="w-4 h-4 text-blue-400" />;
      case 'creative': return <Lightbulb className="w-4 h-4 text-purple-400" />;
      default: return <MessageCircle className="w-4 h-4 text-green-400" />;
    }
  };

  const getPriorityClass = (priority?: string) => {
    switch (priority) {
      case 'high': return 'border-red-500/40 bg-red-500/10 text-red-200';
      case 'low': return 'border-gray-600 bg-gray-800/40 text-gray-400';
      default: return 'border-indigo-500/30 bg-indigo-500/10 text-indigo-200';
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-850 rounded-xl border border-gray-750 overflow-hidden shadow-xl">
      <div className="p-4 border-b border-gray-750 bg-gray-900 flex justify-between items-center">
        <h3 className="font-semibold text-gray-100 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
          {t('questions.aiCopilot')}
        </h3>
        <span className="text-xs text-gray-500 bg-gray-800 px-2 py-1 rounded">
          {isProcessing ? t('questions.thinking') : t('questions.listening')}
        </span>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth">
        {questions.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-500 text-center opacity-60">
            <MessageCircle className="w-12 h-12 mb-3" />
            <p className="text-sm">{t('questions.startSpeaking')}</p>
            <p className="text-xs mt-1">{t('questions.aiDescription')}</p>
          </div>
        ) : (
          questions.map((q) => (
            <div 
              key={q.id} 
              className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 p-4 rounded-lg animate-in slide-in-from-bottom-5 fade-in duration-500"
            >
              <div className="flex items-center gap-2 mb-2 text-xs uppercase tracking-wider text-gray-400 font-bold">
                {getIcon(q.category)}
                {q.category}
                {q.priority && (
                  <span className={`ml-auto rounded-full border px-2 py-0.5 text-[10px] normal-case tracking-normal ${getPriorityClass(q.priority)}`}>
                    {q.priority}
                  </span>
                )}
              </div>
              <p className="text-lg text-white font-medium leading-relaxed">
                {q.text}
              </p>
              {q.rationale && (
                <p className="mt-3 flex gap-2 text-xs leading-5 text-gray-400">
                  <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-indigo-300" />
                  {q.rationale}
                </p>
              )}
            </div>
          ))
        )}
        {isProcessing && (
           <div className="flex items-center space-x-2 p-2">
             <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
             <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
             <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
           </div>
        )}
      </div>
    </div>
  );
};

export default QuestionPanel;
