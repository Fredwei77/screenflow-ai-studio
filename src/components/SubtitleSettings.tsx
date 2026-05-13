import React, { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useSubtitleStore } from '../stores/useSubtitleStore';

interface SubtitleSettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

const LANG_OPTIONS = [
  { value: null, labelKey: 'subtitles.systemDefault' },
  { value: 'en-US', label: 'English (US)' },
  { value: 'zh-CN', label: '中文 (普通话)' },
];

const AUTO_HIDE_OPTIONS = [
  { value: 3000, seconds: 3 },
  { value: 5000, seconds: 5 },
  { value: 8000, seconds: 8 },
  { value: Infinity, seconds: null },
];

export const SubtitleSettings: React.FC<SubtitleSettingsProps> = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  const panelRef = useRef<HTMLDivElement>(null);
  const speechLangOverride = useSubtitleStore((s) => s.speechLangOverride);
  const subtitleAutoHideMs = useSubtitleStore((s) => s.subtitleAutoHideMs);
  const setSpeechLangOverride = useSubtitleStore((s) => s.setSpeechLangOverride);
  const setSubtitleAutoHideMs = useSubtitleStore((s) => s.setSubtitleAutoHideMs);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={panelRef}
      className="absolute bottom-full mb-2 right-0 w-64 bg-gray-800 border border-gray-700 rounded-xl p-4 shadow-xl z-20 pointer-events-auto"
    >
      <h4 className="text-sm font-semibold text-white mb-3">{t('subtitles.settings')}</h4>

      {/* Recognition Language */}
      <div className="mb-3">
        <label className="text-xs text-gray-400 mb-1 block">{t('subtitles.language')}</label>
        <select
          value={speechLangOverride || ''}
          onChange={(e) => setSpeechLangOverride(e.target.value || null)}
          className="w-full px-2 py-1.5 bg-gray-700 border border-gray-600 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500"
        >
          {LANG_OPTIONS.map((opt) => (
            <option key={opt.value || 'default'} value={opt.value || ''}>
              {opt.labelKey ? t(opt.labelKey) : opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Auto-hide delay */}
      <div>
        <label className="text-xs text-gray-400 mb-1 block">{t('subtitles.autoHide')}</label>
        <div className="flex gap-1">
          {AUTO_HIDE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setSubtitleAutoHideMs(opt.value)}
              className={`flex-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                subtitleAutoHideMs === opt.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {opt.seconds !== null ? t('subtitles.autoHideSeconds', { seconds: opt.seconds }) : 'OFF'}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
