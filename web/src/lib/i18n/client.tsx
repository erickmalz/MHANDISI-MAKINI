"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";

import type { Locale } from "./locales";
import { richMessage } from "./rich";
import { createT, type Translator } from "./translate";
import type { MessageKey, Messages } from "./types";

type Value = { locale: Locale; t: Translator };
const I18nContext = createContext<Value | null>(null);

/**
 * Gives Client Components the reader's language. Rendered once in the root
 * layout with only the current language's catalogue, so the other language
 * never reaches the browser.
 */
export function I18nProvider({
  locale,
  messages,
  children,
}: {
  locale: Locale;
  messages: Messages;
  children: ReactNode;
}) {
  const value = useMemo(() => ({ locale, t: createT(locale, messages) }), [locale, messages]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

function useI18n(): Value {
  const value = useContext(I18nContext);
  if (!value) throw new Error("Translations are missing: wrap the tree in <I18nProvider>.");
  return value;
}

/** `t` for Client Components. */
export function useT(): Translator {
  return useI18n().t;
}

export function useLocale(): Locale {
  return useI18n().locale;
}

/** `richMessage` bound to the reader's language, for Client Components. */
export function useRich() {
  const t = useT();
  return (key: MessageKey, parts: Record<string, ReactNode>): ReactNode => richMessage(t, key, parts);
}

/** Renders one message. For places where hooks are unavailable, such as inside a server-only component's JSX. */
export function T({ k, params }: { k: MessageKey; params?: Record<string, string | number> }) {
  return <>{useT()(k, params)}</>;
}
