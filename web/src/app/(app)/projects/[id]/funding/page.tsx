import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CaretRight, Plus } from "@phosphor-icons/react/dist/ssr";

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

export default async function FundingPage({
  params,
}: PageProps<"/projects/[id]/funding">) {
  const { id } = await params;
  const project = await getProjectOverview(id);
  if (!project) notFound();

  const requests = await listFundingRequests(project.id);

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
      <Link
        href={`/projects/${project.id}`}
        className="mb-6 inline-flex min-h-12 items-center gap-2 text-sm font-bold text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft size={16} aria-hidden="true" />
        {project.name}
      </Link>

      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-[1.75rem] font-bold text-foreground">
            Funding requests
          </h1>
          <p className="mt-1 text-muted-foreground">
            What has been requested from the client and deposited against it.
          </p>
        </div>
        <Button variant="primary" href={`/projects/${project.id}/funding/new`}>
          <Plus size={20} aria-hidden="true" />
          Create funding request
        </Button>
      </header>

      {requests.length === 0 ? (
        <p className="rounded-lg border border-border bg-card p-4 text-muted-foreground">
          No funding requests yet. Create the first one.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {requests.map((fr) => (
            <FundingRow key={fr.id} projectId={project.id} fr={fr} />
          ))}
        </div>
      )}
    </main>
  );
}

function FundingRow({
  projectId,
  fr,
}: {
  projectId: string;
  fr: FundingRequest;
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
            {fr.displayNumber ?? "Draft"}
          </span>
          <FRStatusBadge status={status} size="sm" />
          {fr.kind === "additional" && (
            <span className="rounded bg-muted px-2 py-0.5 text-xs font-bold text-muted-foreground">
              Additional
            </span>
          )}
        </div>
        <p className="mt-1 truncate text-sm text-muted-foreground">
          {fr.stageName}
          {fr.supersedesDisplayNumber && ` · revises ${fr.supersedesDisplayNumber}`}
        </p>
      </div>
      <div className="flex shrink-0 flex-col gap-1 sm:grid sm:grid-cols-2 sm:gap-6 sm:text-right">
        <MiniStat label="Requested" amount={target} />
        <MiniStat label="Deposited" amount={deposited} />
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
