/**
 * Web-side i18n wrapper.
 *
 * Composes the runtime-agnostic provider/hook from `@workspace/i18n` with
 * web-specific persistence (`localStorage`) and DOM side effects
 * (`<html lang>` / `<html dir>`). Consumers continue to import from
 * `@/shared/contexts/i18nContext` — only this file knows about the package.
 */
import type { ReactNode } from "react";
import {
  I18nProvider as SharedI18nProvider,
  useI18n as useSharedI18n,
  type I18nContextValue,
  type Locale,
  type LocalePersistence,
  type LocaleSideEffects,
} from "@workspace/i18n";

const STORAGE_KEY = "locale";

const localStoragePersistence: LocalePersistence = {
  read: () => {
    if (typeof window === "undefined") return null;
    const v = window.localStorage.getItem(STORAGE_KEY);
    return v === "en" || v === "ar" ? (v as Locale) : null;
  },
  write: (locale) => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, locale);
  },
};

const domSideEffects: LocaleSideEffects = {
  onChange: (locale, dir) => {
    if (typeof document === "undefined") return;
    document.documentElement.lang = locale;
    document.documentElement.dir = dir;
  },
};

export function I18nProvider({ children }: { children: ReactNode }) {
  return (
    <SharedI18nProvider
      initialLocale="ar"
      persistence={localStoragePersistence}
      sideEffects={domSideEffects}
    >
      {children}
    </SharedI18nProvider>
  );
}

export function useI18n(): I18nContextValue {
  return useSharedI18n();
}

export type { I18nContextValue, Locale };
