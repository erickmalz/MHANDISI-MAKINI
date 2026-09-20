import { notFound } from "next/navigation";

import { getProjectOverview, getStockBalances, listStockMovements } from "@/lib/data";
import { Card } from "@/components/ui/Card";
import { PageFrame } from "@/components/ui/PageFrame";
import { PageHeader } from "@/components/ui/PageHeader";
import { DataTable } from "@/components/ui/DataTable";
import { formatDate } from "@/lib/format";
import { getLocale, getT, pageTitle } from "@/lib/i18n/server";
import type { MessageKey } from "@/lib/i18n/types";

export const generateMetadata = pageTitle("materialStock.pageTitle");

/**
 * Material Stock (Phase 3 ticket 06) — current on-hand balance per material
 * for this project, plus the ledger's own recent history for free (§1's
 * "where did this 40 bags of cement come from" audit trail). Read-only: the
 * only writes to this ledger are `carryForwardSurplus` (Stage Closeout) and
 * the Material Take-Off form's "Apply from stock" input — there is no
 * standalone "add stock" action here, matching ticket 06 §3.
 */

const REASON_LABELS: Record<string, MessageKey> = {
  carried_forward: "materialStock.reason.carriedForward",
  drawn_into_takeoff: "materialStock.reason.drawnIntoTakeoff",
  written_off: "materialStock.reason.writtenOff",
};

export default async function MaterialStockPage({
  params,
}: PageProps<"/projects/[id]/material-stock">) {
  const { id } = await params;
  const project = await getProjectOverview(id);
  if (!project) notFound();
  const t = await getT();
  const locale = await getLocale();

  const [balances, movements] = await Promise.all([
    getStockBalances(id),
    listStockMovements(id),
  ]);

  return (
    <PageFrame width="working">
      <PageHeader
        title={t("materialStock.pageTitle")}
        subtitle={t("materialStock.subtitle")}
      />

      <Card className="mb-6 flex flex-col gap-3">
        <h2 className="text-lg font-bold text-card-foreground">{t("materialStock.onSite")}</h2>
        {balances.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {t("materialStock.none")}
          </p>
        ) : (
          <DataTable
            caption={t("materialStock.caption")}
            rows={balances}
            rowKey={(b) => `${b.itemKey}::${b.unit}`}
            columns={[
              {
                key: "item",
                header: t("materialStock.columns.item"),
                className: "capitalize text-card-foreground",
                cell: (b) => (
                  <>
                    {b.itemKey}
                  </>
                ),
              },
              {
                key: "unit",
                header: t("materialStock.columns.unit"),
                className: "text-muted-foreground",
                cell: (b) => (
                  <>
                    {b.unit}
                  </>
                ),
              },
              {
                key: "on-site",
                header: t("materialStock.columns.onSite"),
                className: "font-bold text-card-foreground",
                align: "right",
                cell: (b) => (
                  <>
                    {b.qty}
                  </>
                ),
              },
            ]}
          />
        )}
      </Card>

      <Card className="flex flex-col gap-3">
        <h2 className="text-lg font-bold text-card-foreground">{t("materialStock.recent")}</h2>
        {movements.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("materialStock.noMovements")}</p>
        ) : (
          <ul className="flex flex-col divide-y divide-border">
            {movements.map((m) => (
              <li key={m.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                <div className="min-w-0">
                  <p className="truncate capitalize text-card-foreground">
                    {m.itemKey} <span className="text-muted-foreground">({m.unit})</span>
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {REASON_LABELS[m.reason] ? t(REASON_LABELS[m.reason]) : m.reason} &middot;{" "}
                    {formatDate(m.createdAt, locale)}
                  </p>
                </div>
                <span
                  className={`shrink-0 font-bold ${m.qty >= 0 ? "text-health-green" : "text-destructive"}`}
                >
                  {m.qty >= 0 ? "+" : ""}
                  {m.qty}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </PageFrame>
  );
}
