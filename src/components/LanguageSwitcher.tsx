import React from 'react';
import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';
import { useUIStore } from '../stores/useUIStore';

export const LanguageSwitcher: React.FC = () => {
  const { i18n } = useTranslation();
  const { language, setLanguage } = useUIStore();

  const toggle = () => {
    const next = language === 'en' ? 'zh' : 'en';
    setLanguage(next);
    i18n.changeLanguage(next);
  };

  return (
    <button
      onClick={toggle}
      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors"
    >
      <Globe className="w-4 h-4" />
      {language === 'en' ? '中文' : 'English'}
    </button>
  );
};
