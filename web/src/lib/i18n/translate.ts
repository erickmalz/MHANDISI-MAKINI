import type { Locale } from "./locales";
import type { MessageKey, Messages, PluralMessage } from "./types";

export type Params = Record<string, string | number>;
export type Translator = (key: MessageKey, params?: Params) => string;

type Node = string | PluralMessage | { [key: string]: Node };

function isPlural(node: Node): node is PluralMessage {
  return (
    typeof node === "object" &&
    typeof (node as PluralMessage).one === "string" &&
    typeof (node as PluralMessage).other === "string"
  );
}

function lookup(dict: Messages, key: string): string | PluralMessage | undefined {
  let node: Node | undefined = dict as unknown as Node;
  for (const part of key.split(".")) {
    if (node === undefined || typeof node === "string" || isPlural(node)) return undefined;
    node = node[part];
  }
  if (node === undefined) return undefined;
  return typeof node === "string" || isPlural(node) ? node : undefined;
}

/**
 * Builds the `t` function for one locale. Pure and isomorphic: it takes the
 * catalogue as an argument so a client bundle never has to carry every
 * language. `{name}` placeholders are filled from `params`; a plural message
 * is chosen by `params.count` with the locale's own plural rules.
 */
export function createT(locale: Locale, dict: Messages, fallback?: Messages): Translator {
  const rules = new Intl.PluralRules(locale);
  return (key, params) => {
    const message = lookup(dict, key) ?? (fallback ? lookup(fallback, key) : undefined);
    if (message === undefined) return key;
    const text =
      typeof message === "string"
        ? message
        : message[rules.select(Number(params?.count ?? 0)) === "one" ? "one" : "other"];
    if (!params) return text;
    return text.replace(/\{(\w+)\}/g, (whole, name: string) =>
      name in params ? String(params[name]) : whole,
    );
  };
}

const KEY_SHAPE = /^[a-z][a-zA-Z0-9]*(\.[a-zA-Z0-9]+)+$/;

/**
 * Server Actions and validation schemas return messages. English sentences
 * pass through unchanged; a string that looks like a catalogue key
 * (`auth.validation.passwordTooShort`) is translated. This lets server
 * messages become translatable one at a time without touching every caller.
 */
export function translateIfKey(t: Translator, text: string): string {
  if (!KEY_SHAPE.test(text)) return text;
  const translated = t(text as MessageKey);
  return translated;
}
