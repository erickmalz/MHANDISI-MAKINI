import type { en } from "./messages/en";

/** A plural message: chosen with `t(key, { count })` using the locale's plural rules. */
export type PluralMessage = { one: string; other: string };

/** Widens the English catalogue's literal strings so other languages can hold their own text. */
export type Widen<T> = T extends string
  ? string
  : T extends PluralMessage
    ? PluralMessage
    : { [K in keyof T]: Widen<T[K]> };

/** The shape every language must fill completely — the compiler checks it. */
export type Messages = Widen<typeof en>;

type Paths<T, Prefix extends string = ""> = {
  [K in keyof T & string]: T[K] extends string | PluralMessage
    ? `${Prefix}${K}`
    : Paths<T[K], `${Prefix}${K}.`>;
}[keyof T & string];

/** Every message key, as a dotted path such as `auth.signIn.title`. */
export type MessageKey = Paths<Messages>;
