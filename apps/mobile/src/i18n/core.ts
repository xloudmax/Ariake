import { I18n } from "i18n-js";

import { translations, type SupportedLocale } from "./translations.ts";

export const DEFAULT_LOCALE: SupportedLocale = "en";

export const normalizeLocale = (languageTag?: string | null): SupportedLocale => {
  if (!languageTag) {
    return DEFAULT_LOCALE;
  }

  const normalized = languageTag.replace("_", "-").toLowerCase();

  if (normalized.startsWith("zh")) {
    return "zh-Hans";
  }

  if (normalized.startsWith("en")) {
    return "en";
  }

  return DEFAULT_LOCALE;
};

export const createI18n = (locale: SupportedLocale = DEFAULT_LOCALE) => {
  const instance = new I18n(translations);
  instance.defaultLocale = DEFAULT_LOCALE;
  instance.enableFallback = true;
  instance.locale = locale;
  return instance;
};
