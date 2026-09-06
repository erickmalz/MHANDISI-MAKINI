import type { StageFinancials } from "@/lib/types";
import { supervisorFeePosition } from "@/lib/finance";
import { Card } from "@/components/ui/Card";
import { Money } from "@/components/ui/Money";
import { StatTile } from "@/components/ui/StatTile";

/**
 * The supervision fee is its own ledger — the supervisor's earnings, billed
 * through Fee Invoices, never through client deposits. It is shown apart from
 * the project financial position and never nets against client project funds.
 */
export function SupervisorFee({ f }: { f: StageFinancials }) {
  const fee = supervisorFeePosition(f);

  return (
    <section>
      <h2 className="mb-1 text-xl font-bold text-foreground">Supervisor fee</h2>
      <p className="mb-4 max-w-prose text-sm text-muted-foreground">
        A separate ledger from the project funds above. Billed to the client
        through its own Fee Invoice; it never draws on client deposits.
      </p>
      <Card>
        <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-3">
          <StatTile label="Fee invoiced" amount={fee.invoiced} />
          <StatTile label="Fee received" amount={fee.received} emphasis />
          <StatTile
            label="Fee outstanding"
            amount={fee.outstanding}
            tone={fee.outstanding > 0 ? "destructive" : undefined}
          />
        </div>
        <p className="mt-4 border-t border-border pt-3 text-sm text-muted-foreground">
          Fee earned equals fee received. Remaining fee for this stage is{" "}
          <Money
            amount={fee.remaining}
            className="font-bold text-card-foreground"
          />{" "}
          — still counted in the project&apos;s forecast funding requirement,
          since the client ultimately funds it.
        </p>
      </Card>
    </section>
  );
}
