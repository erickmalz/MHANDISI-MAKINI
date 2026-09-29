/**
 * The CSV Report Export (ticket "Export formats and whether filters carry into
 * them", Round 3): a clean table — one header row, the rows, then the Total
 * row — with no metadata lines, so sorting and pivoting just work. The filter
 * context travels in the filename instead (`./export-filename`).
 *
 * - Amounts are plain whole shillings: no "TZS", no thousands separators.
 * - Headers are in the viewer's language (the caller's translator).
 * - RFC 4180: CRLF line ends; a field holding a comma, quote or line break is
 *   quoted, with inner quotes doubled.
 * - Starts with a UTF-8 BOM so Excel reads Swahili text correctly.
 * - A text cell beginning with `=`, `+`, `-`, `@` (or a tab / CR) is prefixed
 *   with `'` so a spreadsheet never runs it as a formula (CSV injection).
 *   Numbers are never touched, so a negative variance stays a number.
 */
import {
  type ExportCell,
  type ExportTable,
  type ModelContext,
  type ReportExportData,
  buildExportModel,
  buildStatementLedger,
} from "./export-table";

export const CSV_BOM = "﻿";
const FORMULA_START = /^[=+\-@\t\r]/;

function field(cell: ExportCell): string {
  if (cell == null) return "";
  if (typeof cell === "number") return Number.isFinite(cell) ? String(Math.round(cell)) : "";
  const text = FORMULA_START.test(cell) ? `'${cell}` : cell;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function line(cells: ExportCell[]): string {
  return cells.map(field).join(",");
}

/** One table as CSV text: header, rows, then its total row (if any). BOM included. */
export function tableToCsv(table: ExportTable): string {
  const lines = [line(table.columns.map((c) => c.label)), ...table.rows.map(line)];
  if (table.total) lines.push(line(table.total));
  return CSV_BOM + lines.join("\r\n") + "\r\n";
}

/**
 * The CSV for one loaded report or statement. A report has exactly one table;
 * a statement is flattened into its date-sorted Charged / Paid ledger.
 */
export function reportToCsv(data: ReportExportData, ctx: ModelContext): string {
  if (data.kind === "supplier-statement" || data.kind === "subcontractor-statement") {
    return tableToCsv(buildStatementLedger(data, ctx));
  }
  const [table] = buildExportModel(data, ctx).tables;
  return tableToCsv(table);
}
