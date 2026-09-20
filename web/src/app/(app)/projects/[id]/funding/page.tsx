import Link from "next/link";
import { notFound } from "next/navigation";
import { CaretRight, Plus } from "@phosphor-icons/react/dist/ssr";

import { getProjectOverview, listFundingRequests } from "@/lib/data";
import {
  deriveFRStatus,
  depositTarget,
  depositedTotal,
  type FundingRequest,
} from "@/lib/funding";
import { Money } from "@/components/ui/Money";
import { Button } from "@/components/ui/Button";
import { FRStatusBadge } from "./_components/FRStatusBadge";
import { PageFrame } from "@/components/ui/PageFrame";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { getT, pageTitle } from "@/lib/i18n/server";
import type { Translator } from "@/lib/i18n/translate";

export const generateMetadata = pageTitle("funding.pageTitle");

export default async function FundingPage({
  params,
}: PageProps<"/projects/[id]/funding">) {
  const { id } = await params;
  const project = await getProjectOverview(id);
  if (!project) notFound();

  const requests = await listFundingRequests(project.id);
  const t = await getT();

  return (
    <PageFrame width="working">
      <PageHeader
        title={t("funding.pageTitle")}
        subtitle={t("funding.list.subtitle")}
        actions={
          <>
            <Button variant="primary" href={`/projects/${project.id}/funding/new`}>
              <Plus size={20} aria-hidden="true" />
              {t("funding.list.create")}
            </Button>
          </>
        }
      />

      {requests.length === 0 ? (
        <p className="rounded-lg border border-border bg-card p-4 text-muted-foreground">
          {t("funding.list.empty")}
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {requests.map((fr) => (
            <FundingRow key={fr.id} projectId={project.id} fr={fr} t={t} />
          ))}
        </div>
      )}
    </PageFrame>
  );
}

function FundingRow({
  projectId,
  fr,
  t,
}: {
  projectId: string;
  fr: FundingRequest;
  t: Translator;
}) {
  const status = deriveFRStatus(fr);
  const target = depositTarget(fr);
  const deposited = depositedTotal(fr);

  return (
    <Link
      href={`/projects/${projectId}/funding/${fr.id}`}
      className="flex flex-col gap-4 rounded-lg border border-border bg-card p-4 transition-colors hover:border-border-strong sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-bold text-card-foreground">
            {fr.displayNumber ?? t("funding.list.draft")}
          </span>
          <FRStatusBadge status={status} size="sm" />
          {fr.kind === "additional" && (
            <StatusBadge tone="neutral" size="sm">
              {t("funding.list.additional")}
            </StatusBadge>
          )}
        </div>
        <p className="mt-1 truncate text-sm text-muted-foreground">
          {fr.supersedesDisplayNumber
            ? t("funding.list.stageRevises", {
                stage: fr.stageName,
                number: fr.supersedesDisplayNumber,
              })
            : fr.stageName}
        </p>
      </div>
      <div className="flex shrink-0 flex-col gap-1 sm:grid sm:grid-cols-2 sm:gap-6 sm:text-right">
        <MiniStat label={t("funding.list.requested")} amount={target} />
        <MiniStat label={t("funding.list.deposited")} amount={deposited} />
      </div>
      <CaretRight
        size={18}
        className="hidden shrink-0 text-muted-foreground sm:block"
        aria-hidden="true"
      />
    </Link>
  );
}

function MiniStat({ label, amount }: { label: string; amount: number }) {
  return (
    <div className="flex items-baseline justify-between gap-3 sm:block">
      <p className="text-sm text-muted-foreground">{label}</p>
      <Money
        amount={amount}
        className="shrink-0 whitespace-nowrap font-bold text-card-foreground"
      />
    </div>
  );
}
