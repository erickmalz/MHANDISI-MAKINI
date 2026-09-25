import type { ProjectFinancialSummary } from "@/lib/data/reports";
import { formatTZS } from "@/lib/finance";
import { formatDate } from "@/lib/format";
import { getT } from "@/lib/i18n/server";
import type { MessageKey } from "@/lib/i18n/types";
import { STAGE_STATUS_LABEL } from "../../../_components/status-labels";

/**
 * Same health -> label mapping as `HealthBadge`, reimplemented here rather
 * than reused: `HealthBadge` colors itself from the app's dark-mode-aware
 * `--color-health-*` tokens, which would shift the printed sheet's colors
 * whenever the viewer's OS is in dark mode. Paper stays paper.
 */
const HEALTH_LABEL: Record<string, MessageKey> = {
  green: "common.health.comfortable",
  amber: "common.health.tight",
  red: "common.health.underfunded",
  blue: "common.health.pending",
};
const HEALTH_COLOR: Record<string, string> = {
  green: "#168A56",
  amber: "#A96800",
  red: "#D64545",
  blue: "#2667D9",
};

/**
 * The Financial Summary report's print sheet (prototyped on the throwaway
 * branch `prototype/reports-print-sheet-2026-09`; the "working ledger"
 * option won — landscape, table-first, with a Notes column and a
 * reviewed-by/signature line, meant to be carried into a site meeting and
 * written on). Ticket 06 (`.scratch/phase4/issues/06-advanced-reporting-
 * dashboard.md`) ruled out PDF/JPG export for the six live report screens —
 * this is a plain browser print instead, always reflecting the live figures,
 * never a frozen issued record.
 *
 * Hidden on screen (`hidden print:block`) — `PrintButton` is the only way to
 * reach it. Paper is always white with charcoal ink regardless of the
 * viewer's OS theme, so every color here is a literal brand hex, never the
 * app's dark-mode-aware `--color-*` tokens.
 */
export async function PrintSheet({
  report,
  clientName,
  site,
}: {
  report: ProjectFinancialSummary;
  clientName: string;
  site: string;
}) {
  const t = await getT();
  const printedAt = formatDate(new Date());

  const figures: [string, number][] = [
    [t("reports.financialSummary.fundingRequested"), report.fundingRequested],
    [t("reports.financialSummary.fundingReceived"), report.fundingReceived],
    [t("reports.financialSummary.feesInvoiced"), report.feesInvoiced],
    [t("reports.financialSummary.feesReceived"), report.feesReceived],
    [t("reports.financialSummary.feesOutstanding"), report.feesOutstanding],
    [t("reports.financialSummary.commitments"), report.commitments],
    [t("reports.financialSummary.payments"), report.payments],
    [t("reports.financialSummary.availableFloat"), report.availableFloat],
    [t("reports.financialSummary.forecastShortfall"), report.forecastShortfall],
  ];

  return (
    <div className="hidden print:block">
      <style>{`
        @page { size: A4 landscape; margin: 12mm 14mm; }
        .ps { font-family: var(--mm-font-body); color: #252A2D; background: #fff; font-size: 11.5px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        .ps table { width: 100%; border-collapse: collapse; margin-top: 14px; font-size: 11.5px; }
        .ps th { text-align: right; font-weight: 700; background: #F7F8F6; border: 1px solid #7B858E; padding: 7px 8px; }
        .ps th:first-child, .ps td:first-child { text-align: left; }
        .ps th:last-child, .ps td:last-child { text-align: left; }
        .ps td { text-align: right; border: 1px solid #DCE1E5; padding: 7px 8px; vertical-align: top; }
        .ps tbody tr:nth-child(even) { background: #F7F8F6; }
        .ps tfoot td { font-weight: 700; border: 1px solid #7B858E; background: #fff; }
        .ps .tabular { font-variant-numeric: tabular-nums; }
        /* Below the app's 14px accessibility floor (eslint.config.mjs) on purpose —
           ink-on-paper print density, same reasoning as the issued documents'
           own stylesheet (print-css.ts), which is plain CSS for the same reason. */
        .ps .meta { font-size: 11px; color: #5E6872; }
        .ps .ribbon { font-size: 11px; }
        .ps .status { font-size: 10px; color: #5E6872; }
        .ps .sign { font-size: 12px; }
      `}</style>
      <div className="ps">
        <div className="flex items-baseline justify-between border-b-2 border-[#252A2D] pb-2">
          <h1 className="m-0 font-[var(--mm-font-heading)] text-[16px] font-bold">
            {report.projectName} — {t("reports.financialSummary.label")}
          </h1>
          <span className="meta">
            {report.projectCode} · {t("reports.financialSummary.printSheet.printedOn", { date: printedAt })}
          </span>
        </div>

        <div className="ribbon mt-2 flex flex-wrap gap-x-7 gap-y-1 border-b border-[#DCE1E5] py-2">
          <span>
            {t("reports.financialSummary.printSheet.client")}:{" "}
            <b className="font-bold">{clientName}</b>
          </span>
          <span>
            {t("reports.financialSummary.printSheet.site")}: <b className="font-bold">{site}</b>
          </span>
          {figures.map(([label, amount]) => (
            <span key={label}>
              {label}: <b className="tabular font-bold">{formatTZS(amount)}</b>
            </span>
          ))}
        </div>

        {report.stages.length > 0 && (
          <table>
            <thead>
              <tr>
                <th>{t("reports.financialSummary.columns.stage")}</th>
                <th>{t("reports.financialSummary.columns.health")}</th>
                <th>{t("reports.financialSummary.columns.clientDeposits")}</th>
                <th>{t("reports.financialSummary.columns.commitments")}</th>
                <th>{t("reports.financialSummary.columns.payments")}</th>
                <th>{t("reports.financialSummary.columns.availableFloat")}</th>
                <th>{t("reports.financialSummary.columns.forecastRequirement")}</th>
                <th className="w-[18%]">{t("reports.financialSummary.printSheet.notes")}</th>
              </tr>
            </thead>
            <tbody>
              {report.stages.map((s) => (
                <tr key={s.stageId}>
                  <td>
                    {s.stageName}
                    <div className="status">
                      {STAGE_STATUS_LABEL[s.status] ? t(STAGE_STATUS_LABEL[s.status]) : s.status}
                    </div>
                  </td>
                  <td className="text-left">
                    <span className="font-bold" style={{ color: HEALTH_COLOR[s.health] }}>
                      {t(HEALTH_LABEL[s.health])}
                    </span>
                  </td>
                  <td className="tabular">{formatTZS(s.clientDeposits)}</td>
                  <td className="tabular">{formatTZS(s.commitments)}</td>
                  <td className="tabular">{formatTZS(s.payments)}</td>
                  <td className="tabular">{formatTZS(s.availableFloat)}</td>
                  <td className="tabular">{formatTZS(s.forecastFundingRequirement)}</td>
                  <td>&nbsp;</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={2}>{t("common.total")}</td>
                <td className="tabular">
                  {formatTZS(report.stages.reduce((n, s) => n + s.clientDeposits, 0))}
                </td>
                <td className="tabular">{formatTZS(report.commitments)}</td>
                <td className="tabular">{formatTZS(report.payments)}</td>
                <td className="tabular">{formatTZS(report.availableFloat)}</td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          </table>
        )}

        <div className="sign mt-8 flex gap-16">
          <span className="flex-1 border-t border-[#252A2D] pt-1.5">
            {t("reports.financialSummary.printSheet.reviewedBy")}
          </span>
          <span className="flex-1 border-t border-[#252A2D] pt-1.5">
            {t("reports.financialSummary.printSheet.date")}
          </span>
          <span className="flex-1 border-t border-[#252A2D] pt-1.5">
            {t("reports.financialSummary.printSheet.signature")}
          </span>
        </div>
      </div>
    </div>
  );
}
