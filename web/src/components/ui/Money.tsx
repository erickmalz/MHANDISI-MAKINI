import { formatTZS } from "@/lib/finance";

export function Money({
  amount,
  className = "",
  negativeClassName = "font-bold text-destructive",
}: {
  amount: number;
  className?: string;
  negativeClassName?: string;
}) {
  const isNegative = amount < 0;
  return (
    <span className={`tabular-nums ${isNegative ? negativeClassName : className}`}>
      {formatTZS(amount)}
    </span>
  );
}
