import { createContext, useContext } from 'react';
import en from './locales/en';
import fr from './locales/fr';

export type TranslationKey = keyof typeof en;

const locales: Record<string, typeof en> = {
  en,
  fr,
};

export const supportedLanguages = [
  { code: 'en', name: 'English' },
  { code: 'fr', name: 'Français' },
];

export function getTranslations(lang: string): typeof en {
  // Try exact match, then language prefix, then fallback to English
  if (locales[lang]) return locales[lang];
  const prefix = lang.split('-')[0];
  if (locales[prefix]) return locales[prefix];
  return locales.en;
}

export function detectLanguage(systemLocale: string): string {
  const prefix = systemLocale.split('-')[0].toLowerCase();
  if (locales[prefix]) return prefix;
  return 'en';
}

interface I18nContextValue {
  t: typeof en;
  language: string;
  setLanguage: (lang: string) => void;
}

export const I18nContext = createContext<I18nContextValue | null>(null);

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within I18nProvider');
  }
  return context;
}
