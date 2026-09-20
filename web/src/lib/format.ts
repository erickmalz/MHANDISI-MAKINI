/**
 * Presentation helpers shared across screens.
 *
 * Dates are always shown unambiguously as "06 Sep 2026" per the MHANDISI
 * MAKINI voice-and-copy rules — never "06/09/26".
 */

import { INTL_TAG, type Locale } from "@/lib/i18n/locales";

/**
 * Format an ISO date string (or Date) as "06 Sep 2026" — or "06 Ago 2026" in
 * Kiswahili. Defaults to English so documents and e-mails, which have no
 * reader locale, keep their current wording.
 */
export function formatDate(input: string | Date, locale: Locale = "en"): string {
  const date = typeof input === "string" ? new Date(input) : input;
  if (Number.isNaN(date.getTime())) {
    return typeof input === "string" ? input : "";
  }
  return date
    .toLocaleDateString(INTL_TAG[locale], {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })
    .replace("Sept", "Sep");
}

/** Today, formatted as "06 Sep 2026". */
export function today(locale: Locale = "en"): string {
  return formatDate(new Date(), locale);
}
