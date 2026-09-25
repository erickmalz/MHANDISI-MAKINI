import Link from "next/link";
import { notFound } from "next/navigation";
import {
  CheckCircle,
  Info,
  Warning,
  WarningCircle,
} from "@phosphor-icons/react/dist/ssr";

import { getStageDetail, getStageReconciliationReport } from "@/lib/data";
import type { ReconciliationCheck } from "@/lib/reconciliation";
import { Card } from "@/components/ui/Card";
import { PageFrame } from "@/components/ui/PageFrame";
import { PageHeader } from "@/components/ui/PageHeader";
import { getT, pageTitle } from "@/lib/i18n/server";

export const generateMetadata = pageTitle("financialCheck.pageTitle");

/** The 18 checks the report can contain, by their stable `key`. Unknown keys fall back to the English label. */
const CHECK_KEYS = [
  "unallocated-deposit",
  "labour-exceeds-agreement",
  "float-negative",
  "po-missing-receipt",
  "po-missing-delivery-note",
  "po-outstanding",
  "material-not-ordered",
  "funding-request-pending",
  "additional-funding-required",
  "fee-outstanding",
  "float-below-upcoming-commitments",
  "stage-complete-labour-outstanding",
  "labour-final-payment-incomplete",
  "over-payment-visibility",
  "completed-task-labour-balance",
  "duplicate-payment-reference",
  "procurement-vs-material-requirement",
  "stale-draft-variations",
] as const;
type CheckKey = (typeof CHECK_KEYS)[number];

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

  const [stage, report, t] = await Promise.all([
    getStageDetail(stageId),
    getStageReconciliationReport(stageId),
    getT(),
  ]);
  if (!stage || stage.projectId !== id || !report) notFound();

  const criticalChecks = report.checks.filter((c) => c.status === "critical");
  const warningChecks = report.checks.filter((c) => c.status === "warning");
  const passedChecks = report.checks.filter((c) => c.status === "passed");
  // Check labels are translated here by their stable key; the findings text under
  // each check is produced by the data layer and is not translated yet.
  const checkLabel = (check: ReconciliationCheck) =>
    (CHECK_KEYS as readonly string[]).includes(check.key)
      ? t(`financialCheck.checks.${check.key as CheckKey}`)
      : check.label;

  return (
    <PageFrame width="reading">
      <PageHeader
        crumbs={[{ label: t("financialCheck.crumbOverview"), href: `/projects/${id}` }, { label: stage.name, href: `/projects/${id}/stages/${stageId}` }]}
        title={t("financialCheck.title")}
        subtitle={t("financialCheck.subtitle")}
      />

      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile
          label={t("financialCheck.tiles.score")}
          value={`${report.score}%`}
          tone={report.score >= 90 ? "green" : report.score >= 70 ? "amber" : "red"}
        />
        <StatTile label={t("financialCheck.tiles.passed")} value={String(report.passed)} tone="green" />
        <StatTile label={t("financialCheck.tiles.warnings")} value={String(report.warnings)} tone="amber" />
        <StatTile label={t("financialCheck.tiles.critical")} value={String(report.critical)} tone="red" />
      </div>

      {criticalChecks.length > 0 && (
        <ChecksSection
          title={t("financialCheck.sections.critical", { count: criticalChecks.length })}
          labelOf={checkLabel}
          icon={WarningCircle}
          iconClassName="text-health-red"
          checks={criticalChecks}
        />
      )}

      {warningChecks.length > 0 && (
        <ChecksSection
          title={t("financialCheck.sections.warnings", { count: warningChecks.length })}
          labelOf={checkLabel}
          icon={Warning}
          iconClassName="text-health-amber"
          checks={warningChecks}
        />
      )}

      <Card className="mt-8">
        <h2 className="text-lg font-bold text-card-foreground">
          {t("financialCheck.sections.passed", { count: passedChecks.length })}
        </h2>
        {passedChecks.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            {t("financialCheck.nothingPassed")}
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
                  {checkLabel(check)}
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
    </PageFrame>
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
  const bgClass = {
    green: "bg-health-green-bg",
    amber: "bg-health-amber-bg",
    red: "bg-health-red-bg",
  }[tone];
  const valueClass = {
    green: "text-health-green",
    amber: "text-health-amber",
    red: "text-health-red",
  }[tone];
  return (
    <div className={`rounded-lg p-4 ${bgClass}`}>
      <p className="text-sm font-bold text-foreground">
        {label}
      </p>
      <p className={`mt-1 text-2xl font-bold ${valueClass}`}>{value}</p>
    </div>
  );
}

function ChecksSection({
  title,
  icon: Icon,
  iconClassName,
  checks,
  labelOf,
}: {
  title: string;
  labelOf: (check: ReconciliationCheck) => string;
  icon: typeof WarningCircle;
  iconClassName: string;
  checks: ReconciliationCheck[];
}) {
  return (
    <Card className="mb-6">
      <h2 className="text-lg font-bold text-card-foreground">
        {title}
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
              {labelOf(check)}
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
