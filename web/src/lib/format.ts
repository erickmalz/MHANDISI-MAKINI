/**
 * Presentation helpers shared across screens.
 *
 * Dates are always shown unambiguously as "06 Sep 2026" per the MHANDISI
 * MAKINI voice-and-copy rules — never "06/09/26".
 */

/** Format an ISO date string (or Date) as "06 Sep 2026". */
export function formatDate(input: string | Date): string {
  const date = typeof input === "string" ? new Date(input) : input;
  if (Number.isNaN(date.getTime())) {
    return typeof input === "string" ? input : "";
  }
  return date
    .toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })
    .replace("Sept", "Sep");
}

/** Today, formatted as "06 Sep 2026". */
export function today(): string {
  return formatDate(new Date());
}
