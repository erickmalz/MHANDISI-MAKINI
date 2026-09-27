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
      <table className="w-full text-sm">
        <caption className="sr-only">{subtitle}</caption>
        <thead>
          <tr className="border-b border-border text-muted-foreground">
            <td />
            <th scope="col" className="px-3 py-2.5 text-right font-bold">
              {t("overview.breakdown.materials")}
            </th>
            <th scope="col" className="py-2.5 pl-3 pr-4 text-right font-bold md:pr-5">
              {t("overview.breakdown.labour")}
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key} className="border-b border-border">
              <th scope="row" className="py-2.5 pl-4 pr-3 text-left font-bold md:pl-5">
                {row.label}
              </th>
              <td className="px-3 py-2.5 text-right">
                <Money amount={row.materials} className="text-card-foreground" />
              </td>
              <td className="py-2.5 pl-3 pr-4 text-right md:pr-5">
                <Money amount={row.labour} className="text-card-foreground" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <dl className="flex flex-wrap justify-end gap-x-8 gap-y-2 rounded-b-[10px] bg-muted px-4 py-3.5 text-sm md:px-5">
        <div className="flex gap-2">
          <dt className="text-muted-foreground">{t("overview.breakdown.forecast.remainingCost")}</dt>
          <dd>
            <Money amount={remainingStageRequirement(f)} className="font-bold text-card-foreground" />
          </dd>
        </div>
        <div className="flex gap-2">
          <dt className="text-muted-foreground">{t("overview.breakdown.forecast.float")}</dt>
          <dd>
            <Money amount={availableFloat(f)} className="font-bold text-card-foreground" />
          </dd>
        </div>
        <div className="flex gap-2">
          <dt className="text-muted-foreground">
            {isSurplus
              ? t("overview.breakdown.forecast.surplus")
              : t("overview.breakdown.forecast.requirement")}
          </dt>
          <dd>
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
