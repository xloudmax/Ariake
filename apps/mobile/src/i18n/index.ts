import { AppState } from "react-native";

let getLocales: () => { languageTag: string }[];
try {
  const ExpoLocalization = require("expo-localization");
  getLocales = ExpoLocalization.getLocales;
} catch (e) {
  console.warn("expo-localization native module not found, falling back to English.");
  getLocales = () => [{ languageTag: "en-US" }];
}

import { createI18n, normalizeLocale } from "./core";
import type { SupportedLocale } from "./translations";

export { normalizeLocale } from "./core";
export { formatDate, formatNumber, formatPercent } from "@c404/shared";

export const getSystemLocale = (): SupportedLocale => {
  return normalizeLocale(getLocales()[0]?.languageTag);
};

export const i18n = createI18n(getSystemLocale());

export const refreshLocaleFromSystem = (): SupportedLocale => {
  const locale = getSystemLocale();
  i18n.locale = locale;
  return locale;
};

export const subscribeToLocaleChanges = (onChange: (locale: SupportedLocale) => void) => {
  const subscription = AppState.addEventListener("change", (state) => {
    if (state === "active") {
      onChange(refreshLocaleFromSystem());
    }
  });

  return () => subscription.remove();
};

export const t = i18n.t.bind(i18n);
