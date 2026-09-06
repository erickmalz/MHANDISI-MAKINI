import type { StageFinancials } from "@/lib/types";
import {
  availableFloat,
  remainingStageRequirement,
  forecastFundingRequirement,
  feeOutstanding,
} from "@/lib/finance";
import { Money } from "@/components/ui/Money";

function Row({
  label,
  amount,
  tone,
}: {
  label: string;
  amount: number;
  tone?: "surplus";
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border py-2 text-sm last:border-b-0">
      <span className="text-muted-foreground">{label}</span>
      <Money
        amount={amount}
        className={`shrink-0 whitespace-nowrap font-bold ${
          tone === "surplus" ? "text-health-green" : "text-card-foreground"
        }`}
        negativeClassName="shrink-0 whitespace-nowrap font-bold text-destructive"
      />
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <h3 className="text-base font-bold text-card-foreground">{title}</h3>
      <div className="mt-2">{children}</div>
    </div>
  );
}

export function Breakdown({ f }: { f: StageFinancials }) {
  const ffr = forecastFundingRequirement(f);
  const isSurplus = ffr <= 0;

  return (
    <section>
      <h2 className="mb-4 text-xl font-bold text-foreground">Breakdown</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Panel title="Materials">
          <Row label="Paid" amount={f.paidPurchases} />
          <Row label="Open commitments" amount={f.openPurchaseCommitments} />
          <Row label="Remaining to procure" amount={f.remainingMaterial} />
        </Panel>
        <Panel title="Labour">
          <Row label="Paid" amount={f.labourPayments} />
          <Row label="Outstanding (signed, unpaid)" amount={f.openLabourCommitments} />
          <Row label="Remaining work" amount={f.remainingLabour} />
        </Panel>
        <Panel title="Supervisor fee">
          <Row label="Invoiced" amount={f.feeInvoiced} />
          <Row label="Received" amount={f.feeReceived} />
          <Row label="Outstanding" amount={feeOutstanding(f)} />
        </Panel>
        <Panel title="Forecast">
          <Row label="Remaining expected cost" amount={remainingStageRequirement(f)} />
          <Row label="Available Float" amount={availableFloat(f)} />
          <Row
            label={isSurplus ? "Funding surplus" : "Funding requirement"}
            amount={Math.abs(ffr)}
            tone={isSurplus ? "surplus" : undefined}
          />
        </Panel>
      </div>
    </section>
  );
}
