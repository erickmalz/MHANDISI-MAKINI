import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle,
  Info,
  Warning,
  WarningCircle,
} from "@phosphor-icons/react/dist/ssr";

import { getStageDetail, getStageReconciliationReport } from "@/lib/data";
import type { ReconciliationCheck } from "@/lib/reconciliation";
import { Card } from "@/components/ui/Card";

/**
 * "Run Financial Check" (guidelines §34; Phase 3 ticket 04) — a live audit
 * against the guideline's 17 recommended reconciliation checks, computed
 * fresh on every visit with nothing stored. It complements the always-on
 * Alerts feed (folds its output straight into this tally) rather than
 * replacing it — see `src/lib/data/reconciliation.ts`.
 */
export default async function StageFinancialCheckPage({
  params,
}: PageProps<"/projects/[id]/stages/[stageId]/financial-check">) {
  const { id, stageId } = await params;

  const [stage, report] = await Promise.all([
    getStageDetail(stageId),
    getStageReconciliationReport(stageId),
  ]);
  if (!stage || stage.projectId !== id || !report) notFound();

  const criticalChecks = report.checks.filter((c) => c.status === "critical");
  const warningChecks = report.checks.filter((c) => c.status === "warning");
  const passedChecks = report.checks.filter((c) => c.status === "passed");

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
      <Link
        href={`/projects/${id}/stages/${stageId}`}
        className="mb-6 inline-flex min-h-12 items-center gap-2 text-sm font-bold text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft size={16} aria-hidden="true" />
        {stage.name}
      </Link>

      <header className="mb-6">
        <p className="text-sm text-muted-foreground">
          Stage {stage.seq} &middot; {stage.projectName}
        </p>
        <h1 className="text-[1.75rem] font-bold text-foreground">
          Run Financial Check
        </h1>
        <p className="mt-2 max-w-prose text-muted-foreground">
          A live audit against the guidelines&rsquo; recommended reconciliation
          checks — computed fresh every time, nothing stored. This
          complements the Alerts feed; it does not replace it.
        </p>
      </header>

      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile
          label="Reconciliation Score"
          value={`${report.score}%`}
          tone={report.score >= 90 ? "green" : report.score >= 70 ? "amber" : "red"}
        />
        <StatTile label="Passed" value={String(report.passed)} tone="green" />
        <StatTile label="Warnings" value={String(report.warnings)} tone="amber" />
        <StatTile label="Critical Issues" value={String(report.critical)} tone="red" />
      </div>

      {criticalChecks.length > 0 && (
        <ChecksSection
          title="Critical Issues"
          icon={WarningCircle}
          iconClassName="text-health-red"
          checks={criticalChecks}
        />
      )}

      {warningChecks.length > 0 && (
        <ChecksSection
          title="Warnings"
          icon={Warning}
          iconClassName="text-health-amber"
          checks={warningChecks}
        />
      )}

      <Card className="mt-8">
        <h2 className="text-lg font-bold text-card-foreground">
          Passed ({passedChecks.length})
        </h2>
        {passedChecks.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            Nothing passed cleanly this run.
          </p>
        ) : (
          <ul className="mt-3 flex flex-col gap-4">
            {passedChecks.map((check) => (
              <li key={check.key}>
                <p className="flex items-start gap-2 text-sm font-bold text-card-foreground">
                  <CheckCircle
                    size={16}
                    className="mt-0.5 shrink-0 text-health-green"
                    aria-hidden="true"
                  />
                  {check.label}
                </p>
                {check.findings.length > 0 && (
                  <ul className="mt-1 ml-6 flex flex-col gap-1">
                    {check.findings.map((f, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-2 text-sm text-muted-foreground"
                      >
                        <Info
                          size={14}
                          className="mt-0.5 shrink-0 text-health-blue"
                          aria-hidden="true"
                        />
                        <span>{f.message}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </main>
  );
}

function StatTile({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "green" | "amber" | "red";
}) {
  const toneClass = {
    green: "text-health-green bg-health-green-bg",
    amber: "text-health-amber bg-health-amber-bg",
    red: "text-health-red bg-health-red-bg",
  }[tone];
  return (
    <div className={`rounded-lg p-4 ${toneClass}`}>
      <p className="text-xs font-bold uppercase tracking-wide opacity-80">
        {label}
      </p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </div>
  );
}

function ChecksSection({
  title,
  icon: Icon,
  iconClassName,
  checks,
}: {
  title: string;
  icon: typeof WarningCircle;
  iconClassName: string;
  checks: ReconciliationCheck[];
}) {
  return (
    <Card className="mb-6">
      <h2 className="text-lg font-bold text-card-foreground">
        {title} ({checks.length})
      </h2>
      <ul className="mt-3 flex flex-col gap-4">
        {checks.map((check) => (
          <li key={check.key}>
            <p className="flex items-start gap-2 text-sm font-bold text-card-foreground">
              <Icon
                size={16}
                className={`mt-0.5 shrink-0 ${iconClassName}`}
                aria-hidden="true"
              />
              {check.label}
            </p>
            <ul className="mt-1 ml-6 flex flex-col gap-1">
              {check.findings
                .filter((f) => f.severity !== "info")
                .map((f, i) => (
                  <li key={i} className="text-sm text-muted-foreground">
                    {f.href ? (
                      <Link href={f.href} className="underline">
                        {f.message}
                      </Link>
                    ) : (
                      f.message
                    )}
                  </li>
                ))}
            </ul>
          </li>
        ))}
      </ul>
    </Card>
  );
}
