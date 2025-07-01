import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import en from './en.json';
import es from './es.json';
import fr from './fr.json';
import bn from './bn.json';
import hi from './hi.json';
import ar from './ar.json';
import zhTW from './zh-TW.json';
import ptBR from './pt-BR.json';

const resources = {
  en: { translation: en },
  es: { translation: es },
  fr: { translation: fr },
  bn: { translation: bn },
  hi: { translation: hi },
  ar: { translation: ar },
  'zh-TW': { translation: zhTW },
  'pt-BR': { translation: ptBR },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
    detection: {
      order: ['navigator'],
      caches: [],
    },
  });

const rtlLanguages = ['ar'];

i18n.on('languageChanged', (lng) => {
  document.documentElement.dir = rtlLanguages.includes(lng) ? 'rtl' : 'ltr';
});

export default i18n;
