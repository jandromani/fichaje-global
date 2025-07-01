import { format } from 'date-fns';
import { es, enUS, fr, bn, hi, ar, zhTW, ptBR } from 'date-fns/locale';

const locales: Record<string, Locale> = {
  es,
  en: enUS,
  fr,
  bn,
  hi,
  ar,
  'zh-TW': zhTW,
  'pt-BR': ptBR,
};

export function formatDate(date: Date, locale: string): string {
  const loc = locales[locale] || enUS;
  return format(date, 'PPPP', { locale: loc });
}
