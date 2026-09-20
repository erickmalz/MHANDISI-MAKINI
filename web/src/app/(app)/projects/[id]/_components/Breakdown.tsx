import { CaretRight } from "@phosphor-icons/react/dist/ssr";

import type { StageFinancials } from "@/lib/types";
import {
  availableFloat,
  remainingStageRequirement,
  forecastFundingRequirement,
} from "@/lib/finance";
import { getT } from "@/lib/i18n/server";
import { Money } from "@/components/ui/Money";

function Row({
  label,
  amount,
  tone,
}: {
  label: string;
  amount: number;
  tone?: "surplus";
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border py-2 text-sm last:border-b-0">
      <span className="text-muted-foreground">{label}</span>
      <Money
        amount={amount}
        className={`shrink-0 whitespace-nowrap font-bold ${
          tone === "surplus" ? "text-health-green" : "text-card-foreground"
        }`}
        negativeClassName="shrink-0 whitespace-nowrap font-bold text-destructive"
      />
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-base font-bold text-card-foreground">{title}</h3>
      <div className="mt-2">{children}</div>
    </div>
  );
}

/**
 * The detail behind the position, closed until asked for: what is paid, what
 * is committed and what is still to come, by materials and labour. Native
 * `<details>` — keyboard and screen-reader operable with no script.
 */
export async function Breakdown({ f }: { f: StageFinancials }) {
  const t = await getT();
  const ffr = forecastFundingRequirement(f);
  const isSurplus = ffr <= 0;

  return (
    <details className="group rounded-lg border border-border bg-card">
      <summary className="flex min-h-12 cursor-pointer list-none items-center gap-2 rounded-lg px-4 py-2 outline-ring focus-visible:outline-2 focus-visible:outline-offset-2 [&::-webkit-details-marker]:hidden">
        <CaretRight
          size={16}
          aria-hidden="true"
          className="shrink-0 text-muted-foreground transition-transform group-open:rotate-90 motion-reduce:transition-none"
        />
        <h2 className="text-xl font-bold text-card-foreground">{t("overview.breakdown.title")}</h2>
        <span className="ml-1 text-sm text-muted-foreground">
          {t("overview.breakdown.hint")}
        </span>
      </summary>
      <div className="grid grid-cols-1 gap-6 border-t border-border p-4 sm:grid-cols-2 lg:grid-cols-3">
        <Panel title={t("overview.breakdown.materials.title")}>
          <Row label={t("overview.breakdown.materials.paid")} amount={f.paidPurchases} />
          <Row label={t("overview.breakdown.materials.open")} amount={f.openPurchaseCommitments} />
          <Row label={t("overview.breakdown.materials.toProcure")} amount={f.remainingMaterial} />
        </Panel>
        <Panel title={t("overview.breakdown.labour.title")}>
          <Row label={t("overview.breakdown.labour.paid")} amount={f.labourPayments} />
          <Row label={t("overview.breakdown.labour.outstanding")} amount={f.openLabourCommitments} />
          <Row label={t("overview.breakdown.labour.remainingWork")} amount={f.remainingLabour} />
        </Panel>
        <Panel title={t("overview.breakdown.forecast.title")}>
          <Row label={t("overview.breakdown.forecast.remainingCost")} amount={remainingStageRequirement(f)} />
          <Row label={t("overview.breakdown.forecast.float")} amount={availableFloat(f)} />
          <Row
            label={isSurplus ? t("overview.breakdown.forecast.surplus") : t("overview.breakdown.forecast.requirement")}
            amount={Math.abs(ffr)}
            tone={isSurplus ? "surplus" : undefined}
          />
        </Panel>
      </div>
    </details>
  );
}
