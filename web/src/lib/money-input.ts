/**
 * Pure helpers behind `MoneyInput`: turn whatever was typed or pasted into the
 * plain digits a Server Action expects, and group thousands for display.
 * No React here so the rules are easy to test.
 */

export type MoneyRules = {
  /** Allow a leading minus (e.g. a variation that reduces cost). */
  allowNegative?: boolean;
  /** Allow one decimal point. Whole shillings by default. */
  allowDecimals?: boolean;
};

/** "TZS 1,250,000", "1 250 000" and "1250000.50" all become plain digits. */
export function cleanMoney(text: string, rules: MoneyRules = {}): string {
  let t = text.replace(/[,\s]/g, "");
  const negative = Boolean(rules.allowNegative) && t.startsWith("-");
  t = t.replace(/[^\d.]/g, "");
  if (!rules.allowDecimals) {
    t = t.replace(/\./g, "");
  } else {
    const dot = t.indexOf(".");
    if (dot >= 0) t = t.slice(0, dot + 1) + t.slice(dot + 1).replace(/\./g, "");
  }
  t = t.replace(/^0+(?=\d)/, "");
  return negative ? `-${t}` : t;
}

/** "12500000" -> "12,500,000". Leaves partial input ("", "-", "12.") readable. */
export function groupMoney(raw: string): string {
  if (raw === "" || raw === "-") return raw;
  const negative = raw.startsWith("-");
  const [whole, fraction] = (negative ? raw.slice(1) : raw).split(".");
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${negative ? "-" : ""}${grouped}${fraction !== undefined ? `.${fraction}` : ""}`;
}
