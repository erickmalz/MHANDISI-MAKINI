import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ClockCounterClockwise } from "@phosphor-icons/react/dist/ssr";

import { getProjectActivity, getProjectOverview } from "@/lib/data";
import { formatDate } from "@/lib/format";
import { Card } from "@/components/ui/Card";

/**
 * Comprehensive Activity History (guidelines §40/§60 item 5; ticket 05,
 * `.scratch/phase4/issues/05-comprehensive-activity-history.md`) — a
 * derived, read-only chronological feed, computed fresh on every visit from
 * `getProjectActivity` (`@/lib/data/activity.ts`). No stored audit log, no
 * field-level diff, no "Reason" capture — see that module's header for the
 * full posture. The optional `?stage=` query param filters to one Stage,
 * same idiom as the Funding Request / Purchase Order detail pages'
 * `searchParams` use.
 */
export default async function ProjectActivityPage({
  params,
  searchParams,
}: PageProps<"/projects/[id]/activity">) {
  const { id } = await params;
  const { stage: stageParam } = await searchParams;
  const stageId = typeof stageParam === "string" && stageParam.length > 0 ? stageParam : undefined;

  const project = await getProjectOverview(id);
  if (!project) notFound();

  const events = await getProjectActivity(id, { stageId });
  const stages = project.stages.slice().sort((a, b) => a.seq - b.seq);

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
      <Link
        href={`/projects/${id}`}
        className="mb-6 inline-flex min-h-12 items-center gap-2 text-sm font-bold text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft size={16} aria-hidden="true" />
        {project.name}
      </Link>

      <header className="mb-6">
        <div className="flex items-center gap-2">
          <ClockCounterClockwise size={24} className="text-muted-foreground" aria-hidden="true" />
          <h1 className="text-[1.75rem] font-bold text-foreground">Activity history</h1>
        </div>
        <p className="mt-2 max-w-prose text-muted-foreground">
          Every stage, task, variation, purchase order, funding request,
          deposit, delivery, and payment event on this project, newest
          first — assembled live from each record&rsquo;s own dates, nothing
          stored separately.
        </p>
      </header>

      {stages.length > 0 && (
        <div className="mb-6 flex flex-wrap items-center gap-2">
          <FilterLink projectId={id} label="All stages" active={!stageId} />
          {stages.map((s) => (
            <FilterLink
              key={s.id}
              projectId={id}
              stageId={s.id}
              label={s.name}
              active={stageId === s.id}
            />
          ))}
        </div>
      )}

      {events.length === 0 ? (
        <p className="rounded-lg border border-border bg-card p-4 text-muted-foreground">
          Nothing recorded yet for this {stageId ? "stage" : "project"}.
        </p>
      ) : (
        <Card>
          <ul className="flex flex-col divide-y divide-border">
            {events.map((event) => (
              <li key={event.id} className="py-3 first:pt-0 last:pb-0">
                <Link href={event.href} className="group flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-card-foreground group-hover:underline">
                      {event.summary}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">{event.stageName}</p>
                  </div>
                  <time
                    dateTime={event.occurredAt}
                    className="shrink-0 whitespace-nowrap text-xs text-muted-foreground"
                  >
                    {formatDate(event.occurredAt)}
                  </time>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </main>
  );
}

function FilterLink({
  projectId,
  stageId,
  label,
  active,
}: {
  projectId: string;
  stageId?: string;
  label: string;
  active: boolean;
}) {
  const href = stageId
    ? `/projects/${projectId}/activity?stage=${stageId}`
    : `/projects/${projectId}/activity`;
  return (
    <Link
      href={href}
      className={`inline-flex min-h-9 items-center rounded-lg border px-3 py-1 text-sm font-bold transition-colors ${
        active
          ? "border-foreground bg-foreground text-background"
          : "border-border bg-card text-muted-foreground hover:border-border-strong hover:text-foreground"
      }`}
    >
      {label}
    </Link>
  );
}
