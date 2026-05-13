import { useCallback, useMemo } from 'react';
import i18n from '../i18n';
import { useSummaryStore } from '../stores/useSummaryStore';
import { aiApi } from '../services/api';

export function useSummary() {
  const { summary, isGenerating, isSummaryModalOpen, transcript, setSummary, setGenerating, toggleSummaryModal, setSummaryModalOpen } = useSummaryStore();

  const generateSummary = useCallback(async () => {
    if (isGenerating) return; // Guard against concurrent calls
    if (!transcript || transcript.length < 50) {
      alert(i18n.t('summary.notEnough'));
      return;
    }

    setGenerating(true);
    try {
      const result = await aiApi.generateSummary(transcript);
      setSummary(JSON.stringify(result));
    } catch (err) {
      console.error('Summary generation failed:', err);
      alert(i18n.t('summary.failed'));
    } finally {
      setGenerating(false);
    }
  }, [transcript, isGenerating, setGenerating, setSummary]);

  const parsedSummary = useMemo(() => {
    if (!summary) return null;
    try {
      return JSON.parse(summary);
    } catch {
      return null;
    }
  }, [summary]);

  return {
    summary: parsedSummary,
    isGenerating,
    isSummaryModalOpen,
    transcript,
    generateSummary,
    toggleSummaryModal,
    setSummaryModalOpen,
  };
}
