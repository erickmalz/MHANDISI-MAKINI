import "server-only";

import type { Metadata } from "next";
import { cookies, headers } from "next/headers";
import { cache } from "react";

import { catalogues } from "./catalogues";
import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale, negotiateLocale, type Locale } from "./locales";
import { createT, type Translator } from "./translate";
import type { MessageKey } from "./types";

/**
 * The reader's language: their saved choice, else the browser's preference,
 * else English. Cached per request so every caller sees the same answer.
 */
export const getLocale = cache(async (): Promise<Locale> => {
  const saved = (await cookies()).get(LOCALE_COOKIE)?.value;
  if (isLocale(saved)) return saved;
  return negotiateLocale((await headers()).get("accept-language")) ?? DEFAULT_LOCALE;
});

/** `t` for Server Components, Server Actions and route handlers. */
export const getT = cache(async (): Promise<Translator> => {
  const locale = await getLocale();
  return createT(locale, catalogues[locale], catalogues.en);
});

/** For `export const generateMetadata = pageTitle("funding.pageTitle")`. */
export function pageTitle(key: MessageKey) {
  return async (): Promise<Metadata> => ({ title: (await getT())(key) });
}
