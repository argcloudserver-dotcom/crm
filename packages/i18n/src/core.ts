/**
 * @workspace/i18n — runtime-agnostic translation core.
 *
 * Pure TypeScript. No React, no DOM, no React Native. Both web and mobile
 * apps build their platform-specific `<I18nProvider>` on top of this.
 */
import en from "./locales/en.json";
import ar from "./locales/ar.json";

export type Locale = "en" | "ar";
export type Direction = "ltr" | "rtl";

export type TranslationTree = { [k: string]: string | TranslationTree };

export const LOCALES: readonly Locale[] = ["en", "ar"] as const;

export const LOCALE_DIR: Record<Locale, Direction> = {
  en: "ltr",
  ar: "rtl",
};

export const LOCALE_TAG: Record<Locale, string> = {
  en: "en-EG",
  ar: "ar-EG",
};

export const translations: Record<Locale, TranslationTree> = {
  en: en as TranslationTree,
  ar: ar as TranslationTree,
};

export const DEFAULT_LOCALE: Locale = "ar";

/** Resolve a dotted key against the translation tree. Parent leaves stored under "_". */
export function lookup(
  tree: TranslationTree,
  key: string,
): string | undefined {
  const parts = key.split(".");
  let node: string | TranslationTree | undefined = tree;
  for (const p of parts) {
    if (typeof node !== "object" || node === null) return undefined;
    node = (node as TranslationTree)[p];
    if (node === undefined) return undefined;
  }
  if (typeof node === "string") return node;
  if (
    typeof node === "object" &&
    node !== null &&
    typeof (node as TranslationTree)._ === "string"
  ) {
    return (node as TranslationTree)._ as string;
  }
  return undefined;
}

export function interpolate(
  str: string,
  vars?: Record<string, string | number>,
): string {
  if (!vars) return str;
  let out = str;
  for (const [k, v] of Object.entries(vars)) {
    out = out.replace(new RegExp(`{{\\s*${k}\\s*}}`, "g"), String(v));
  }
  return out;
}

/** Translate a key with fallback to English then to the raw key. */
export function translate(
  locale: Locale,
  key: string,
  vars?: Record<string, string | number>,
): string {
  const str =
    lookup(translations[locale], key) ?? lookup(translations.en, key) ?? key;
  return interpolate(str, vars);
}

/** Build Intl-based formatters for a given locale. */
export function buildFormatters(locale: Locale) {
  const tag = LOCALE_TAG[locale];
  return {
    formatPrice: (val: number): string =>
      new Intl.NumberFormat(tag, {
        style: "currency",
        currency: "EGP",
        maximumFractionDigits: 0,
      }).format(val),
    formatNumber: (val: number, opts?: Intl.NumberFormatOptions): string =>
      new Intl.NumberFormat(tag, opts).format(val),
    formatDate: (
      val: Date | string | number,
      opts?: Intl.DateTimeFormatOptions,
    ): string => new Intl.DateTimeFormat(tag, opts).format(new Date(val)),
  };
}

export type Formatters = ReturnType<typeof buildFormatters>;

/**
 * Pluggable persistence for the active locale.
 * Web apps wire `localStorage`; mobile wires `AsyncStorage`.
 */
export interface LocalePersistence {
  read(): Locale | null | Promise<Locale | null>;
  write(locale: Locale): void | Promise<void>;
}

/**
 * Platform side effects applied whenever the locale changes
 * (e.g. setting `<html dir>` on web, or `I18nManager.forceRTL` on native).
 */
export interface LocaleSideEffects {
  onChange(locale: Locale, dir: Direction): void;
}

export const noopPersistence: LocalePersistence = {
  read: () => null,
  write: () => {},
};

export const noopSideEffects: LocaleSideEffects = {
  onChange: () => {},
};

export const isRTL = (locale: Locale): boolean => LOCALE_DIR[locale] === "rtl";
