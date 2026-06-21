/**
 * @workspace/i18n/react — React provider/hook on top of the runtime-agnostic core.
 *
 * Consumers inject platform persistence + side-effect adapters so this file
 * stays free of DOM and React Native APIs.
 */
import * as React from "react";
import {
  DEFAULT_LOCALE,
  LOCALE_DIR,
  buildFormatters,
  noopPersistence,
  noopSideEffects,
  translate,
  type Direction,
  type Formatters,
  type Locale,
  type LocalePersistence,
  type LocaleSideEffects,
} from "./core";

export interface I18nContextValue extends Formatters {
  locale: Locale;
  dir: Direction;
  isRTL: boolean;
  t: (key: string, vars?: Record<string, string | number>) => string;
  setLocale: (locale: Locale) => void;
  toggleLocale: () => void;
}

const I18nContext = React.createContext<I18nContextValue | null>(null);

export interface I18nProviderProps {
  children: React.ReactNode;
  /** Initial locale; ignored once persistence resolves. */
  initialLocale?: Locale;
  persistence?: LocalePersistence;
  sideEffects?: LocaleSideEffects;
}

export function I18nProvider({
  children,
  initialLocale = DEFAULT_LOCALE,
  persistence = noopPersistence,
  sideEffects = noopSideEffects,
}: I18nProviderProps): React.ReactElement {
  const [locale, setLocaleState] = React.useState<Locale>(initialLocale);

  // Hydrate from persistence on mount (supports sync or async adapters).
  React.useEffect(() => {
    let cancelled = false;
    Promise.resolve(persistence.read())
      .then((stored) => {
        if (!cancelled && stored) setLocaleState(stored);
      })
      .catch(() => {
        /* ignore — fall back to initial */
      });
    return () => {
      cancelled = true;
    };
  }, [persistence]);

  const dir = LOCALE_DIR[locale];

  // Side effects + persistence on locale change.
  React.useEffect(() => {
    sideEffects.onChange(locale, dir);
    void Promise.resolve(persistence.write(locale)).catch(() => {});
  }, [locale, dir, persistence, sideEffects]);

  const setLocale = React.useCallback((l: Locale) => setLocaleState(l), []);
  const toggleLocale = React.useCallback(
    () => setLocaleState((prev) => (prev === "en" ? "ar" : "en")),
    [],
  );

  const t = React.useCallback(
    (key: string, vars?: Record<string, string | number>) =>
      translate(locale, key, vars),
    [locale],
  );

  const formatters = React.useMemo(() => buildFormatters(locale), [locale]);

  const value = React.useMemo<I18nContextValue>(
    () => ({
      locale,
      dir,
      isRTL: dir === "rtl",
      t,
      setLocale,
      toggleLocale,
      ...formatters,
    }),
    [locale, dir, t, setLocale, toggleLocale, formatters],
  );

  return (
    <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
  );
}

export function useI18n(): I18nContextValue {
  const ctx = React.useContext(I18nContext);
  if (!ctx) {
    throw new Error("useI18n must be used within an <I18nProvider>");
  }
  return ctx;
}
