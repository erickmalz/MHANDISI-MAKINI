import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr";

import type { StageFinancials } from "@/lib/types";
import { supervisorFeePosition } from "@/lib/finance";
import { getT } from "@/lib/i18n/server";
import { Money } from "@/components/ui/Money";
import { StatusBadge } from "@/components/ui/StatusBadge";

/**
 * The supervision fee is its own ledger — the supervisor's earnings, billed
 * through Fee Invoices, never through client deposits. It is shown apart from
 * the project financial position (a dashed edge and its own label) and never
 * nets against client project funds.
 */
export async function SupervisorFee({
  projectId,
  f,
}: {
  projectId: string;
  f: StageFinancials;
}) {
  const t = await getT();
  const fee = supervisorFeePosition(f);

  const lines = [
    { key: "recorded", label: t("overview.fee.recorded"), amount: fee.recorded },
    { key: "invoiced", label: t("overview.fee.invoiced"), amount: fee.invoiced },
    { key: "received", label: t("overview.fee.received"), amount: fee.received },
  ];

  return (
    <section
      aria-labelledby="overview-fee"
      className="rounded-lg border border-dashed border-border-strong bg-card p-4 md:p-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="overview-fee" className="text-lg text-card-foreground">
          {t("overview.fee.title")}
        </h2>
        <StatusBadge tone="info" size="sm">
          {t("overview.fee.separate")}
        </StatusBadge>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">{t("overview.fee.intro")}</p>
      <dl className="mt-3 text-sm">
        {lines.map((line) => (
          <div key={line.key} className="flex justify-between gap-3 border-b border-border py-2">
            <dt className="text-muted-foreground">{line.label}</dt>
            <dd>
              <Money amount={line.amount} className="font-bold text-card-foreground" />
            </dd>
          </div>
        ))}
        <div
          className={`-mx-3 mt-1 flex justify-between gap-3 rounded-md px-3 py-2 ${
            fee.outstanding > 0 ? "bg-health-red-bg" : ""
          }`}
        >
          <dt className="font-bold text-card-foreground">{t("overview.fee.outstanding")}</dt>
          <dd>
            <Money amount={fee.outstanding} className="font-bold text-card-foreground" />
          </dd>
        </div>
      </dl>
      <p className="mt-3 text-sm text-muted-foreground">
        {t("overview.fee.earned")} {t("overview.fee.remaining")}{" "}
        <Money amount={fee.remaining} className="font-bold text-card-foreground" />.{" "}
        {t("overview.fee.remainingNote")}
      </p>
      <Link
        href={`/projects/${projectId}/fee-invoices`}
        className="mt-1 inline-flex min-h-11 items-center gap-1.5 text-sm font-bold text-foreground underline underline-offset-2"
      >
        {t("overview.fee.invoices")}
        <ArrowRight size={16} aria-hidden="true" />
      </Link>
    </section>
  );
}
