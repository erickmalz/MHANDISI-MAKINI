import type { Locale } from "./locales";
import { en } from "./messages/en";
import { sw } from "./messages/sw";
import type { Messages } from "./types";

export const catalogues: Record<Locale, Messages> = { en, sw };
