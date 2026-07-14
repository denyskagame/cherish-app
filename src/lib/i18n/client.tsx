"use client";
import { createContext, useContext, useEffect, useState } from "react";
import type { I18nKey } from "./dictionaries";

type Locale = "en" | "fr";

const Ctx = createContext<{
  locale: Locale;
  setLocale: (l: Locale) => void;
  dict: Record<I18nKey, string>;
} | null>(null);

const STORAGE_KEY = "cherish.locale";

/**
 * Holds both locales' dictionaries so a toggle is instant (docs/07 §7–8).
 * Initial locale precedence — saved choice → browser language → event default —
 * is resolved on mount to keep the server render deterministic (avoids hydration
 * mismatch); `initialLocale` is the event default the server rendered with.
 */
export function I18nProvider({
  initialLocale,
  enabledLocales,
  dictionaries,
  children,
}: {
  initialLocale: Locale;
  enabledLocales: Locale[];
  dictionaries: Record<Locale, Record<I18nKey, string>>;
  children: React.ReactNode;
}) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);

  // Resolve saved/browser preference after mount. This is the sanctioned
  // "initialize from a client-only source" case: localStorage / navigator don't
  // exist on the server, so reading them during render would cause a hydration
  // mismatch — the one-time correction has to happen in a mount effect.
  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY) as Locale | null;
    const browser = navigator.language?.toLowerCase().startsWith("fr")
      ? "fr"
      : "en";
    const resolved =
      saved && enabledLocales.includes(saved)
        ? saved
        : enabledLocales.includes(browser)
          ? browser
          : initialLocale;
    if (resolved !== initialLocale) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time client-preference sync; see comment above
      setLocaleState(resolved);
    }
  }, [enabledLocales, initialLocale]);

  // Keep <html lang> in sync so screen readers pronounce FR correctly.
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const setLocale = (l: Locale) => {
    setLocaleState(l);
    window.localStorage.setItem(STORAGE_KEY, l);
  };

  return (
    <Ctx.Provider value={{ locale, setLocale, dict: dictionaries[locale] }}>
      {children}
    </Ctx.Provider>
  );
}

export const useLocale = () => useContext(Ctx)!.locale;
export const useSetLocale = () => useContext(Ctx)!.setLocale;

/** Translate a key, with optional `{token}` interpolation. */
export const useT = () => {
  const c = useContext(Ctx)!;
  return (k: I18nKey, vars?: Record<string, string | number>) => {
    let s = c.dict[k] ?? k;
    if (vars) {
      for (const [name, value] of Object.entries(vars)) {
        s = s.replace(`{${name}}`, String(value));
      }
    }
    return s;
  };
};
