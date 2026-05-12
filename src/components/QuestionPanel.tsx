import React, { useEffect, useRef } from 'react';
import { Question } from '../types';
import { MessageCircle, Zap, HelpCircle, Lightbulb } from 'lucide-react';

interface QuestionPanelProps {
  questions: Question[];
  isProcessing: boolean;
}

const QuestionPanel: React.FC<QuestionPanelProps> = ({ questions, isProcessing }) => {
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

  return (
    <div className="flex flex-col h-full bg-gray-850 rounded-xl border border-gray-750 overflow-hidden shadow-xl">
      <div className="p-4 border-b border-gray-750 bg-gray-900 flex justify-between items-center">
        <h3 className="font-semibold text-gray-100 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
          AI Co-Pilot
        </h3>
        <span className="text-xs text-gray-500 bg-gray-800 px-2 py-1 rounded">
          {isProcessing ? 'Thinking...' : 'Listening'}
        </span>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth">
        {questions.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-500 text-center opacity-60">
            <MessageCircle className="w-12 h-12 mb-3" />
            <p className="text-sm">Start speaking...</p>
            <p className="text-xs mt-1">AI will generate questions to keep you going.</p>
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
              </div>
              <p className="text-lg text-white font-medium leading-relaxed">
                {q.text}
              </p>
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
