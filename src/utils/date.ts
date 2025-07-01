import { format } from 'date-fns';
import { enUS, es, fr, bn, zhTW, ptBR, hi } from 'date-fns/locale';

const locales: Record<string, Locale> = {
  en: enUS,
  es,
  fr,
  bn,
  'zh-TW': zhTW,
  'pt-BR': ptBR,
  hi
};

export function formatLocalizedDate(date: Date, lang: string, fmt = 'P') {
  const locale = locales[lang] || locales[lang.split('-')[0]] || es;
  return format(date, fmt, { locale });
}
