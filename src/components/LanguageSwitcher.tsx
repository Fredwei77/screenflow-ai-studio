import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';
import { useUIStore } from '../stores/useUIStore';

export const LanguageSwitcher: React.FC = () => {
  const { i18n } = useTranslation();
  const { language, setLanguage } = useUIStore();
  const currentLanguage = i18n.language?.startsWith('zh') ? 'zh' : 'en';

  useEffect(() => {
    if (currentLanguage !== language) {
      i18n.changeLanguage(language);
      document.documentElement.lang = language === 'zh' ? 'zh-CN' : 'en';
    }
  }, [currentLanguage, i18n, language]);

  const toggle = () => {
    const next = currentLanguage === 'en' ? 'zh' : 'en';
    setLanguage(next);
    i18n.changeLanguage(next);
    document.documentElement.lang = next === 'zh' ? 'zh-CN' : 'en';
  };

  return (
    <button
      onClick={toggle}
      className="flex items-center gap-2 rounded-lg bg-gray-800 px-4 py-2 transition-colors hover:bg-gray-700"
      aria-label="Switch language"
    >
      <Globe className="h-4 w-4" />
      {currentLanguage === 'en' ? '中文' : 'English'}
    </button>
  );
};
