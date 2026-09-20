import type { StageFinancials } from "@/lib/types";
import { supervisorFeePosition } from "@/lib/finance";
import { getT } from "@/lib/i18n/server";
import { Card } from "@/components/ui/Card";
import { Money } from "@/components/ui/Money";
import { StatTile } from "@/components/ui/StatTile";

/**
 * The supervision fee is its own ledger — the supervisor's earnings, billed
 * through Fee Invoices, never through client deposits. It is shown apart from
 * the project financial position and never nets against client project funds.
 */
export async function SupervisorFee({ f }: { f: StageFinancials }) {
  const t = await getT();
  const fee = supervisorFeePosition(f);

  return (
    <section>
      <h2 className="mb-1 text-xl font-bold text-foreground">{t("overview.fee.title")}</h2>
      <p className="mb-4 max-w-prose text-sm text-muted-foreground">
        {t("overview.fee.intro")}
      </p>
      <Card>
        <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-3">
          <StatTile label={t("overview.fee.invoiced")} amount={fee.invoiced} />
          <StatTile label={t("overview.fee.received")} amount={fee.received} emphasis />
          <StatTile
            label={t("overview.fee.outstanding")}
            amount={fee.outstanding}
            tone={fee.outstanding > 0 ? "destructive" : undefined}
          />
        </div>
        <p className="mt-4 border-t border-border pt-3 text-sm text-muted-foreground">
          {t("overview.fee.earned")} {t("overview.fee.remaining")}{" "}
          <Money
            amount={fee.remaining}
            className="font-bold text-card-foreground"
          />
          . {t("overview.fee.remainingNote")}
        </p>
      </Card>
    </section>
  );
}
