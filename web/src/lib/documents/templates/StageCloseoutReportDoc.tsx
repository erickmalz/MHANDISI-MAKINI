import type { StageCloseoutReportDocument } from "@/lib/data/documents";
import { formatTZS } from "@/lib/finance";

import {
  Callout,
  GrandTotal,
  isoToDisplay,
  SectionTable,
  Shell,
  TextBlock,
  type MetaItem,
} from "./parts";

const FINANCIAL_CHECK_LABEL: Record<
  StageCloseoutReportDocument["snapshot"]["financialCheckStatus"],
  string
> = {
  passed: "Passed — no Warnings or Critical issues at close",
  warning: "Warnings on file at close (see the Financial Check for detail)",
  critical: "Critical issues on file at close (see the Financial Check for detail)",
};

/**
 * The Stage Closeout Report (guidelines §38, §50; Phase 4 ticket 03,
 * `.scratch/phase4/issues/03-stage-closeout-report.md`). Frozen inside the
 * `closeStage` transaction at the moment a Stage closes — Close Stage *is*
 * issuing this report, so every figure below reads exactly as it did that
 * day, even if a later Variation or correction touches the stage's live
 * numbers.
 */
export function StageCloseoutReportDoc({ doc }: { doc: StageCloseoutReportDocument }) {
  const { snapshot, profile, stamp } = doc;

  const meta: MetaItem[] = [
    { label: "Project", value: `${snapshot.projectName} (${snapshot.projectCode})` },
    { label: "Client", value: snapshot.counterpartyName },
    { label: "Site", value: snapshot.site },
    { label: "Stage", value: snapshot.stageName },
    { label: "Closed", value: isoToDisplay(snapshot.issuedOn) },
    { label: "Financial check at close", value: FINANCIAL_CHECK_LABEL[snapshot.financialCheckStatus] },
  ];

  return (
    <Shell
      profile={profile}
      title="Stage Closeout Report"
      number={snapshot.displayNumber}
      stamp={stamp}
      meta={meta}
    >
      <Callout title="Stage budget vs. actual">
        Approved Estimate {formatTZS(snapshot.stageBudget)} against actual cost{" "}
        {formatTZS(snapshot.actualCost)} for this stage (material + labour).
      </Callout>

      {snapshot.sections.map((section) => (
        <SectionTable key={section.title} section={section} showUnitColumns={false} />
      ))}

      <GrandTotal label="Combined Budget Variance" amount={snapshot.total} />

      <Callout title="Accumulated Material Variance (project-wide)">
        {formatTZS(snapshot.accumulatedMaterialVariance)} — Σ Material Variance
        across every stage of this project to date.
      </Callout>

      <section className="section">
        <h2 className="section__title">Fee position</h2>
        <table className="lines">
          <tbody>
            <tr>
              <td>Invoiced</td>
              <td className="num">{formatTZS(snapshot.feeInvoiced)}</td>
            </tr>
            <tr>
              <td>Received</td>
              <td className="num">{formatTZS(snapshot.feeReceived)}</td>
            </tr>
            <tr>
              <td>Outstanding</td>
              <td className="num">{formatTZS(snapshot.feeOutstanding)}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section className="section">
        <h2 className="section__title">Client-fund position</h2>
        <table className="lines">
          <tbody>
            <tr>
              <td>Client deposits</td>
              <td className="num">{formatTZS(snapshot.clientDeposits)}</td>
            </tr>
            <tr>
              <td>
                {snapshot.forecastFundingRequirement > 0
                  ? "Additional funding required"
                  : "Funding surplus at close"}
              </td>
              <td className="num">{formatTZS(snapshot.forecastFundingRequirement)}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section className="section">
        <h2 className="section__title">Materials — on-site surplus (project-wide)</h2>
        {snapshot.materialStockSurplus.length === 0 ? (
          <p>None recorded at close.</p>
        ) : (
          <table className="lines">
            <thead>
              <tr>
                <th>Item</th>
                <th className="num">Qty</th>
                <th>Unit</th>
              </tr>
            </thead>
            <tbody>
              {snapshot.materialStockSurplus.map((line) => (
                <tr key={`${line.itemKey}::${line.unit}`}>
                  <td>{line.itemKey}</td>
                  <td className="num">{line.qty}</td>
                  <td>{line.unit}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="section">
        <h2 className="section__title">Reconciliation at close</h2>
        <table className="lines">
          <tbody>
            <ReconciledRow label="Materials" ok={snapshot.materialsReconciled} />
            <ReconciledRow label="Labour" ok={snapshot.labourReconciled} />
            <ReconciledRow label="Documents" ok={snapshot.documentsReconciled} />
            <ReconciledRow label="Supervisor fee" ok={snapshot.feeReconciled} />
            <ReconciledRow label="Client funds" ok={snapshot.clientFundsReconciled} />
          </tbody>
        </table>
      </section>

      {snapshot.notes ? <TextBlock title="Unresolved notes" body={snapshot.notes} /> : null}
    </Shell>
  );
}

function ReconciledRow({ label, ok }: { label: string; ok: boolean }) {
  return (
    <tr>
      <td>{label}</td>
      <td className="num">{ok ? "Reconciled" : "Not reconciled"}</td>
    </tr>
  );
}
