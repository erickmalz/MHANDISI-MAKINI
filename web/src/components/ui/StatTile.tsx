import { Money } from "./Money";

/**
 * A metric: a quiet 14px label above a large bold value. The label says what
 * is counted; the value carries the weight.
 */
export function StatTile({
  label,
  amount,
  emphasis = false,
  tone,
}: {
  label: string;
  amount: number;
  emphasis?: boolean;
  tone?: "destructive";
}) {
  const toneClass =
    tone === "destructive" ? "text-destructive" : "text-card-foreground";

  return (
    <div className="flex flex-col gap-1">
      <span className="text-sm text-muted-foreground">{label}</span>
      <Money
        amount={amount}
        className={`whitespace-nowrap ${toneClass} font-bold ${emphasis ? "text-xl" : "text-lg"}`}
        negativeClassName={`whitespace-nowrap font-bold text-destructive ${emphasis ? "text-xl" : "text-lg"}`}
      />
    </div>
  );
}
