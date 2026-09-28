import type { Stage } from "@/lib/types";
import {
  availableFloat,
  remainingStageRequirement,
  forecastFundingRequirement,
} from "@/lib/finance";
import { getT } from "@/lib/i18n/server";
import { Money } from "@/components/ui/Money";
import { OverviewPanel } from "./OverviewPanel";

/**
 * The current stage's costs as a small matrix — paid, committed and still to
 * come, by materials and labour — with the forecast underneath: the remaining
 * expected cost against the Available Float, and the surplus or requirement
 * that leaves. Every figure comes from `@/lib/finance`; the matrix adds none of
 * its own (no row or column totals that could disagree with the forecast).
 * The matrix lays out by the panel's width, not the viewport's, and no figure
 * ever breaks across lines.
 */
export async function Breakdown({ stage }: { stage: Stage }) {
  const t = await getT();
  const f = stage.financials;
  const ffr = forecastFundingRequirement(f);
  const isSurplus = ffr <= 0;
  const subtitle = t("overview.breakdown.current", { name: stage.name });

  const rows = [
    { key: "paid", label: t("overview.breakdown.rows.paid"), materials: f.paidPurchases, labour: f.labourPayments },
    {
      key: "committed",
      label: t("overview.breakdown.rows.committed"),
      materials: f.openPurchaseCommitments,
      labour: f.openLabourCommitments,
    },
    {
      key: "remaining",
      label: t("overview.breakdown.rows.remaining"),
      materials: f.remainingMaterial,
      labour: f.remainingLabour,
    },
  ];

  return (
    <OverviewPanel
      headingId="overview-breakdown"
      title={t("overview.breakdown.title")}
      aside={<span className="text-sm">{subtitle}</span>}
    >
      {/* A real table once the panel is wide; below `@md` each row becomes a
          small labelled block (row header on top, materials and labour side by
          side). The explicit roles keep the table semantics when the CSS
          display changes, and the header row stays for screen readers. */}
      <table role="table" className="block w-full text-sm @md:table">
        <caption className="sr-only">{subtitle}</caption>
        <thead role="rowgroup" className="sr-only @md:not-sr-only @md:table-header-group">
          <tr role="row" className="border-b border-border text-muted-foreground">
            <td role="cell" />
            <th role="columnheader" scope="col" className="px-3 py-2.5 text-right font-bold">
              {t("overview.breakdown.materials")}
            </th>
            <th role="columnheader" scope="col" className="py-2.5 pl-3 pr-4 text-right font-bold md:pr-5">
              {t("overview.breakdown.labour")}
            </th>
          </tr>
        </thead>
        <tbody role="rowgroup" className="block @md:table-row-group">
          {rows.map((row) => (
            <tr
              key={row.key}
              role="row"
              className="grid grid-cols-2 gap-x-4 gap-y-1 border-b border-border px-4 py-3 md:px-5 @md:table-row @md:p-0"
            >
              <th
                role="rowheader"
                scope="row"
                className="col-span-2 text-left font-bold @md:table-cell @md:py-2.5 @md:pl-4 @md:pr-3 @md:md:pl-5"
              >
                {row.label}
              </th>
              <td role="cell" className="whitespace-nowrap @md:table-cell @md:px-3 @md:py-2.5 @md:text-right">
                <span aria-hidden="true" className="block text-muted-foreground @md:hidden">
                  {t("overview.breakdown.materials")}
                </span>
                <Money amount={row.materials} className="text-card-foreground" />
              </td>
              <td
                role="cell"
                className="whitespace-nowrap @md:table-cell @md:py-2.5 @md:pl-3 @md:pr-4 @md:text-right @md:md:pr-5"
              >
                <span aria-hidden="true" className="block text-muted-foreground @md:hidden">
                  {t("overview.breakdown.labour")}
                </span>
                <Money amount={row.labour} className="text-card-foreground" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <dl className="flex flex-col gap-2 rounded-b-[11px] bg-muted px-4 py-3.5 text-sm md:px-5 @md:flex-row @md:flex-wrap @md:justify-end @md:gap-x-8">
        <div className="flex justify-between gap-3 @md:justify-start @md:gap-2">
          <dt className="text-muted-foreground">{t("overview.breakdown.forecast.remainingCost")}</dt>
          <dd className="whitespace-nowrap">
            <Money amount={remainingStageRequirement(f)} className="font-bold text-card-foreground" />
          </dd>
        </div>
        <div className="flex justify-between gap-3 @md:justify-start @md:gap-2">
          <dt className="text-muted-foreground">{t("overview.breakdown.forecast.float")}</dt>
          <dd className="whitespace-nowrap">
            <Money amount={availableFloat(f)} className="font-bold text-card-foreground" />
          </dd>
        </div>
        <div className="flex justify-between gap-3 @md:justify-start @md:gap-2">
          <dt className="text-muted-foreground">
            {isSurplus
              ? t("overview.breakdown.forecast.surplus")
              : t("overview.breakdown.forecast.requirement")}
          </dt>
          <dd className="whitespace-nowrap">
            <Money
              amount={Math.abs(ffr)}
              className={`font-bold ${isSurplus ? "text-health-green" : "text-destructive"}`}
            />
          </dd>
        </div>
      </dl>
    </OverviewPanel>
  );
}
