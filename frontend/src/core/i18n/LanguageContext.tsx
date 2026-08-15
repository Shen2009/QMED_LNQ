import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {AppLanguage, AppStrings, getStrings} from './strings';

const LANGUAGE_STORAGE_KEY = 'app_language';

interface LanguageContextType {
  language: AppLanguage;
  strings: AppStrings;
  setLanguage: (language: AppLanguage) => Promise<void>;
  toggleLanguage: () => Promise<void>;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{children: React.ReactNode}> = ({
  children,
}) => {
  const [language, setLanguageState] = useState<AppLanguage>('vi');

  useEffect(() => {
    const loadLanguage = async () => {
      const stored = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
      if (stored === 'vi' || stored === 'en') {
        setLanguageState(stored);
      }
    };

    loadLanguage().catch(error => {
      console.error('Failed to load language setting:', error);
    });
  }, []);

  const setLanguage = useCallback(async (nextLanguage: AppLanguage) => {
    setLanguageState(nextLanguage);
    await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, nextLanguage);
  }, []);

  const toggleLanguage = useCallback(async () => {
    const nextLanguage: AppLanguage = language === 'vi' ? 'en' : 'vi';
    await setLanguage(nextLanguage);
  }, [language, setLanguage]);

  const value = useMemo(
    () => ({
      language,
      strings: getStrings(language),
      setLanguage,
      toggleLanguage,
    }),
    [language, setLanguage, toggleLanguage],
  );

  return (
    <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
};
