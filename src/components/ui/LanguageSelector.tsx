import React from 'react';
import { useTranslation } from 'react-i18next';

const languages = [
  { code: 'es', label: 'Español' },
  { code: 'en', label: 'English' },
  { code: 'fr', label: 'Français' },
  { code: 'bn', label: 'বাংলা' },
  { code: 'zh-TW', label: '繁體中文' },
  { code: 'pt-BR', label: 'Português (BR)' },
  { code: 'hi', label: 'हिन्दी' }
];

export function LanguageSelector() {
  const { i18n } = useTranslation();

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const lang = e.target.value;
    i18n.changeLanguage(lang);
    localStorage.setItem('language', lang);
  };

  return (
    <select
      className="border border-gray-300 rounded-md text-sm py-1 px-2"
      value={i18n.language}
      onChange={handleChange}
    >
      {languages.map(l => (
        <option key={l.code} value={l.code}>{l.label}</option>
      ))}
    </select>
  );
}
