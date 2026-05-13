import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import zh from './locales/zh.json';

const savedLang = (() => {
  try {
    const raw = localStorage.getItem('screenflow-ui');
    if (raw) {
      const parsed = JSON.parse(raw);
      return parsed?.state?.language;
    }
  } catch {}
  return null;
})();

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    zh: { translation: zh },
  },
  lng: savedLang || 'en',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

export default i18n;
