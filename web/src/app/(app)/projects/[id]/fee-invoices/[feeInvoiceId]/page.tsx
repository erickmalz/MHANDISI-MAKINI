import { notFound } from "next/navigation";

import {
  correctFeeInvoiceAction,
  recordFeeInvoicePaymentAction,
  voidFeeInvoiceAction,
} from "@/app/actions/funding";
import { getFeeInvoice } from "@/lib/data";
import { FeeInvoiceDetail } from "./_components/FeeInvoiceDetail";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { PageFrame } from "@/components/ui/PageFrame";
import { getT, pageTitle } from "@/lib/i18n/server";

export const generateMetadata = pageTitle("feeInvoices.detailPageTitle");

export default async function FeeInvoicePage({
  params,
}: PageProps<"/projects/[id]/fee-invoices/[feeInvoiceId]">) {
  const { id, feeInvoiceId } = await params;

  const t = await getT();
  const fi = await getFeeInvoice(feeInvoiceId);
  if (!fi || fi.projectId !== id) notFound();

  return (
    <PageFrame width="working">
      <Breadcrumbs
        crumbs={[{ label: t("feeInvoices.pageTitle"), href: `/projects/${id}/fee-invoices` }]}
      />

      <FeeInvoiceDetail
        fi={fi}
        projectId={id}
        paymentAction={recordFeeInvoicePaymentAction.bind(null, id, fi.id)}
        correctAction={correctFeeInvoiceAction.bind(null, id, fi.id)}
        voidAction={voidFeeInvoiceAction.bind(null, id, fi.id)}
      />
    </PageFrame>
  );
}
