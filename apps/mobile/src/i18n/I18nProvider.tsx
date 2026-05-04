import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import { i18n, refreshLocaleFromSystem, subscribeToLocaleChanges } from ".";
import type { SupportedLocale } from "./translations";

type I18nContextValue = {
  locale: SupportedLocale;
  t: typeof i18n.t;
};

const I18nContext = createContext<I18nContextValue>({
  locale: i18n.locale as SupportedLocale,
  t: i18n.t.bind(i18n),
});

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<SupportedLocale>(() => refreshLocaleFromSystem());

  useEffect(() => {
    return subscribeToLocaleChanges((nextLocale) => {
      setLocale(nextLocale);
    });
  }, []);

  const value = useMemo<I18nContextValue>(
    () => ({
      locale,
      t: i18n.t.bind(i18n),
    }),
    [locale],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export const useI18n = () => useContext(I18nContext);
