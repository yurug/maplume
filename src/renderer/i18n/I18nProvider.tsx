import { useState, useEffect, ReactNode } from 'react';
import { I18nContext, getTranslations, detectLanguage } from './index';

interface I18nProviderProps {
  children: ReactNode;
}

export function I18nProvider({ children }: I18nProviderProps) {
  const [language, setLanguageState] = useState('en');
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    const init = async () => {
      // Check for saved language preference
      const savedLang = localStorage.getItem('maplume-language');
      if (savedLang) {
        setLanguageState(savedLang);
      } else {
        // Auto-detect from system
        const systemLocale = await window.electronAPI.getSystemLocale();
        const detected = detectLanguage(systemLocale);
        setLanguageState(detected);
      }
      setInitialized(true);
    };
    init();
  }, []);

  const setLanguage = (lang: string) => {
    setLanguageState(lang);
    localStorage.setItem('maplume-language', lang);
  };

  const t = getTranslations(language);

  if (!initialized) {
    return null;
  }

  return (
    <I18nContext.Provider value={{ t, language, setLanguage }}>
      {children}
    </I18nContext.Provider>
  );
}
