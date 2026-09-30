import Link from "next/link";

import { Card } from "@/components/ui/Card";
import { getFundingRequest, getPurchaseOrder, getTaskSourcedDocumentIds } from "@/lib/data";
import { deriveFRStatus } from "@/lib/funding";
import { getT } from "@/lib/i18n/server";
import { derivePOStatus } from "@/lib/procurement";
import { FRStatusBadge } from "../../../../funding/_components/FRStatusBadge";
import { POStatusBadge } from "../../../../procurement/_components/POStatusBadge";

/**
 * The Funding Request(s) and Purchase Order(s) this Task's saves have raised —
 * its draft request and planned order while they are editable, and the issued
 * documents they became.
 */
export async function LinkedDocumentsCard({
  projectId,
  taskId,
}: {
  projectId: string;
  taskId: string;
}) {
  const t = await getT();
  const ids = await getTaskSourcedDocumentIds(taskId);
  const [frs, pos] = await Promise.all([
    Promise.all(ids.fundingRequestIds.map((id) => getFundingRequest(id))),
    Promise.all(ids.purchaseOrderIds.map((id) => getPurchaseOrder(id))),
  ]);
  const fundingRequests = frs.filter((fr) => fr != null);
  const purchaseOrders = pos.filter((po) => po != null);

  const rowClass =
    "flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border p-3 transition-colors hover:border-border-strong";

  return (
    <Card>
      <h2 className="text-xl font-bold text-card-foreground">{t("tasks.sourced.linkedTitle")}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{t("tasks.sourced.linkedBody")}</p>

      {fundingRequests.length === 0 && purchaseOrders.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">{t("tasks.sourced.noneYet")}</p>
      ) : (
        <ul className="mt-4 flex flex-col gap-2">
          {fundingRequests.map((fr) => (
            <li key={fr.id}>
              <Link href={`/projects/${projectId}/funding/${fr.id}`} className={rowClass}>
                <span className="text-sm">
                  <span className="text-muted-foreground">{t("tasks.sourced.fundingRequest")}</span>{" "}
                  <span className="font-bold text-card-foreground">
                    {fr.displayNumber ?? t("tasks.sourced.draft")}
                  </span>
                </span>
                <FRStatusBadge status={deriveFRStatus(fr)} size="sm" />
              </Link>
            </li>
          ))}
          {purchaseOrders.map((po) => (
            <li key={po.id}>
              <Link href={`/projects/${projectId}/procurement/${po.id}`} className={rowClass}>
                <span className="text-sm">
                  <span className="text-muted-foreground">{t("tasks.sourced.purchaseOrder")}</span>{" "}
                  <span className="font-bold text-card-foreground">
                    {po.displayNumber ?? t("tasks.sourced.draft")}
                  </span>
                  {po.supplierId == null && (
                    <span className="text-muted-foreground"> · {t("tasks.sourced.noSupplier")}</span>
                  )}
                </span>
                <POStatusBadge status={derivePOStatus(po)} size="sm" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
