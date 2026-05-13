import React, { useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { X, FileText, CheckSquare, HelpCircle, Loader2 } from 'lucide-react';
import { useSummary } from '../hooks/useSummary';
import type { SummaryContent } from '../types';

export const SummaryModal: React.FC = () => {
  const { t } = useTranslation();
  const { summary, isGenerating, isSummaryModalOpen, generateSummary, setSummaryModalOpen } = useSummary();

  const close = useCallback(() => setSummaryModalOpen(false), [setSummaryModalOpen]);

  // Close on Escape key
  useEffect(() => {
    if (!isSummaryModalOpen) return;
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isSummaryModalOpen, close]);

  if (!isSummaryModalOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={close}>
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-lg mx-4 max-h-[80vh] flex flex-col shadow-2xl" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-700">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-400" />
            <h2 className="text-lg font-semibold text-white">{t('summary.title')}</h2>
          </div>
          <button onClick={() => setSummaryModalOpen(false)} className="p-1 rounded text-gray-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {isGenerating ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
              <p className="text-gray-400 text-sm">{t('summary.generating')}</p>
            </div>
          ) : summary ? (
            <SummaryContent data={summary} />
          ) : (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <FileText className="w-12 h-12 text-gray-600" />
              <p className="text-gray-400 text-sm text-center">
                {t('summary.description')}
              </p>
              <button
                onClick={generateSummary}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
              >
                {t('summary.generate')}
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        {summary && (
          <div className="px-5 py-3 border-t border-gray-700 flex justify-end">
            <button
              onClick={generateSummary}
              disabled={isGenerating}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
            >
              {t('summary.regenerate')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

const SummaryContent: React.FC<{ data: SummaryContent }> = ({ data }) => {
  const { t } = useTranslation();
  return (
  <div className="space-y-5">
    {/* Key Points */}
    {data.keyPoints.length > 0 && (
      <Section icon={<FileText className="w-4 h-4 text-blue-400" />} title={t('summary.keyPoints')}>
        <ul className="space-y-1.5">
          {data.keyPoints.map((point, i) => (
            <li key={i} className="text-gray-300 text-sm flex gap-2">
              <span className="text-blue-400 mt-0.5">•</span>
              {point}
            </li>
          ))}
        </ul>
      </Section>
    )}

    {/* Action Items */}
    {data.actionItems.length > 0 && (
      <Section icon={<CheckSquare className="w-4 h-4 text-green-400" />} title={t('summary.actionItems')}>
        <ul className="space-y-1.5">
          {data.actionItems.map((item, i) => (
            <li key={i} className="text-gray-300 text-sm flex gap-2">
              <span className="text-green-400 mt-0.5">☐</span>
              {item}
            </li>
          ))}
        </ul>
      </Section>
    )}

    {/* Questions */}
    {data.questions.length > 0 && (
      <Section icon={<HelpCircle className="w-4 h-4 text-yellow-400" />} title={t('summary.openQuestions')}>
        <ul className="space-y-1.5">
          {data.questions.map((q, i) => (
            <li key={i} className="text-gray-300 text-sm flex gap-2">
              <span className="text-yellow-400 mt-0.5">?</span>
              {q}
            </li>
          ))}
        </ul>
      </Section>
    )}
  </div>
);
};

const Section: React.FC<{ icon: React.ReactNode; title: string; children: React.ReactNode }> = ({ icon, title, children }) => (
  <div>
    <div className="flex items-center gap-2 mb-2">
      {icon}
      <h3 className="text-sm font-medium text-white">{title}</h3>
    </div>
    {children}
  </div>
);
