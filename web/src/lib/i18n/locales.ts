export const LOCALES = ["en", "sw"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";

/** The language choice lives in a cookie: no locale prefix in URLs. */
export const LOCALE_COOKIE = "mm_locale";
export const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

/** Each language is named in itself, so someone who cannot read the current one can still find theirs. */
export const LOCALE_NAMES: Record<Locale, string> = {
  en: "English",
  sw: "Kiswahili",
};

/** BCP 47 tag used for `Intl` formatting of each locale. */
export const INTL_TAG: Record<Locale, string> = {
  en: "en-GB",
  sw: "sw-TZ",
};

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

/** Picks a supported locale from an `Accept-Language` header, or the default. */
export function negotiateLocale(acceptLanguage: string | null | undefined): Locale {
  for (const part of (acceptLanguage ?? "").split(",")) {
    const tag = part.split(";")[0].trim().toLowerCase();
    const base = tag.split("-")[0];
    if (isLocale(base)) return base;
  }
  return DEFAULT_LOCALE;
}
