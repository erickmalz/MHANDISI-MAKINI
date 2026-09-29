import type { ExportFormat } from "./export-href";
import type { ReportKind } from "./filters";

/**
 * Report Export filenames (ticket "Export formats and whether filters carry
 * into them", Round 3): `{Report}-{projectCode}-{YYYY-MM-DD}[-filtered].{ext}`,
 * and `Statement-{PartyName}-{YYYY-MM-DD}[-filtered].{ext}` for a Statement.
 * The same stem serves PDF, JPG and CSV. The date is today in East Africa Time,
 * matching the export's "As of" line. Pure — safe to call from a client
 * component (e.g. to name a `ShareFile`).
 */

const STEM: Record<ReportKind, string> = {
  "financial-summary": "Financial-Summary",
  "material-cost": "Material-Cost",
  procurement: "Procurement",
  labour: "Labour",
  funding: "Funding",
  variations: "Variations",
  "supplier-statement": "Statement",
  "subcontractor-statement": "Statement",
};

export const EXPORT_TIME_ZONE = "Africa/Dar_es_Salaam";

/** `YYYY-MM-DD` for `at` in East Africa Time. */
export function eatIsoDate(at: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: EXPORT_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(at);
}

/** Letters, digits, `.`, `_`, `-` only; spaces become `-`; never empty. */
function safe(part: string): string {
  const cleaned = part
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, "-")
    .replace(/[^A-Za-z0-9._-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return cleaned || "export";
}

export function reportExportFilename(args: {
  kind: ReportKind;
  /** The project code for a report, the party's name for a statement. */
  scopeLabel: string;
  format: ExportFormat;
  filtered: boolean;
  at?: Date;
}): string {
  const parts = [STEM[args.kind], safe(args.scopeLabel), eatIsoDate(args.at)];
  if (args.filtered) parts.push("filtered");
  return `${parts.join("-")}.${args.format}`;
}
