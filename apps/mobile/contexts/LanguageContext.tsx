/**
 * Mobile-side i18n wrapper.
 *
 * Composes the runtime-agnostic provider/hook from `@workspace/i18n` with
 * AsyncStorage-backed persistence and React Native side effects
 * (`I18nManager.forceRTL`). Existing screens keep importing `useLanguage`
 * from `@/contexts/LanguageContext`; only this file knows about the package.
 */
import React from "react";
import { I18nManager } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  I18nProvider as SharedI18nProvider,
  useI18n,
  type Locale,
  type LocalePersistence,
  type LocaleSideEffects,
} from "@workspace/i18n";

export type Language = Locale;

const STORAGE_KEY = "app_language";

const asyncStoragePersistence: LocalePersistence = {
  read: async () => {
    const v = await AsyncStorage.getItem(STORAGE_KEY);
    return v === "en" || v === "ar" ? (v as Locale) : null;
  },
  write: async (locale) => {
    await AsyncStorage.setItem(STORAGE_KEY, locale);
  },
};

const rnSideEffects: LocaleSideEffects = {
  onChange: (locale) => {
    const shouldRTL = locale === "ar";
    if (I18nManager.isRTL !== shouldRTL) {
      try {
        I18nManager.allowRTL(shouldRTL);
        I18nManager.forceRTL(shouldRTL);
      } catch {
        /* RN bridge may not be ready during prerender */
      }
    }
  },
};

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  return (
    <SharedI18nProvider
      initialLocale="en"
      persistence={asyncStoragePersistence}
      sideEffects={rnSideEffects}
    >
      {children}
    </SharedI18nProvider>
  );
}

/** Backwards-compatible hook for existing mobile screens. */
export function useLanguage() {
  const { locale, isRTL, setLocale, toggleLocale, t } = useI18n();
  return {
    language: locale,
    isRTL,
    setLanguage: async (lang: Language) => setLocale(lang),
    toggleLanguage: async () => toggleLocale(),
    t,
  };
}

export { useI18n };
