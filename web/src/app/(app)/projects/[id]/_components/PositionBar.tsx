import { formatTZS } from "@/lib/finance";
import { getT } from "@/lib/i18n/server";
import type { MessageKey } from "@/lib/i18n/types";
import type { StageFinancials } from "@/lib/types";
import { Money } from "@/components/ui/Money";
import { fundingPosition } from "./overview";

/**
 * Each segment is told apart by fill pattern, not colour: solid, diagonal
 * hatch, vertical stripes. The same classes paint the bar and its legend
 * swatches, and the legend spells out every value in words.
 */
const SEGMENTS = {
  paid: {
    labelKey: "overview.bar.paid",
    className: "bg-primary",
  },
  open: {
    labelKey: "overview.bar.open",
    className:
      "bg-[repeating-linear-gradient(135deg,var(--color-primary)_0,var(--color-primary)_2px,transparent_2px,transparent_6px)]",
  },
  remaining: {
    labelKey: "overview.bar.remaining",
    className:
      "bg-[repeating-linear-gradient(90deg,var(--color-border-strong)_0,var(--color-border-strong)_2px,transparent_2px,transparent_5px)]",
  },
} as const satisfies Record<string, { labelKey: MessageKey; className: string }>;

/**
 * One bar for one question: does the client's deposit cover what this stage
 * will cost? The bar stacks what is paid, what is committed and what is still
 * expected; the vertical line marks the client deposit. Where the bar runs
 * past the line, that is the funding shortfall. Drawn only from the stage's
 * own financials — no trend, no history.
 */
export async function PositionBar({ f }: { f: StageFinancials }) {
  const t = await getT();
  const p = fundingPosition(f);

  if (p.scale <= 0) {
    return (
      <div>
        <h3 className="text-base font-bold text-card-foreground">{t("overview.bar.title")}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{t("overview.bar.empty")}</p>
      </div>
    );
  }

  const pct = (n: number) => `${(Math.max(0, n) / p.scale) * 100}%`;
  const depositAt = Math.min(100, (p.deposited / p.scale) * 100);
  const short = p.gap > 0;

  const conclusion =
    p.gap === 0
      ? t("overview.bar.matches")
      : short
        ? t("overview.bar.summaryShortfall", { amount: formatTZS(p.gap) })
        : t("overview.bar.summarySurplus", { amount: formatTZS(-p.gap) });
  const summary = t("overview.bar.summary", {
    deposited: formatTZS(p.deposited),
    forecast: formatTZS(p.forecast),
    paid: formatTZS(p.paid),
    open: formatTZS(p.open),
    remaining: formatTZS(p.remaining),
    conclusion,
  });

  return (
    <div>
      <h3 className="text-base font-bold text-card-foreground">{t("overview.bar.title")}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{t("overview.bar.subtitle")}</p>

      <div className="relative mt-3 pt-7">
        <span
          aria-hidden="true"
          className={`absolute top-0 whitespace-nowrap text-sm font-bold text-card-foreground ${
            depositAt > 60 ? "-translate-x-full pr-2 text-right" : "pl-2"
          }`}
          style={{ left: `${depositAt}%` }}
        >
          {t("overview.bar.deposited")}
        </span>
        <div
          role="img"
          aria-label={summary}
          className="flex h-6 w-full overflow-hidden rounded border border-control-border bg-card"
        >
          <div className={SEGMENTS.paid.className} style={{ width: pct(p.paid) }} />
          <div className={SEGMENTS.open.className} style={{ width: pct(p.open) }} />
          <div className={SEGMENTS.remaining.className} style={{ width: pct(p.remaining) }} />
        </div>
        <span
          aria-hidden="true"
          className="absolute bottom-[-4px] top-5 w-0.5 -translate-x-1/2 bg-foreground"
          style={{ left: `${depositAt}%` }}
        />
      </div>

      <dl className="mt-4 grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">
        {(Object.keys(SEGMENTS) as (keyof typeof SEGMENTS)[]).map((key) => (
          <LegendRow
            key={key}
            label={t(SEGMENTS[key].labelKey)}
            amount={p[key]}
            swatch={
              <span
                aria-hidden="true"
                className={`h-4 w-8 shrink-0 rounded-sm border border-control-border ${SEGMENTS[key].className}`}
              />
            }
          />
        ))}
        <LegendRow
          label={t("overview.bar.deposited")}
          amount={p.deposited}
          swatch={
            <span aria-hidden="true" className="flex h-4 w-8 shrink-0 justify-center">
              <span className="h-full w-0.5 bg-foreground" />
            </span>
          }
        />
      </dl>

      <p className="mt-3 border-t border-border pt-3 text-sm text-muted-foreground">
        {t("overview.bar.forecastTotal")}{" "}
        <Money amount={p.forecast} className="font-bold text-card-foreground" />
        {". "}
        {p.gap === 0 ? (
          t("overview.bar.matches")
        ) : short ? (
          <>
            <span className="font-bold text-destructive">{t("overview.bar.shortfallLabel")}</span>{" "}
            <Money amount={p.gap} className="font-bold text-destructive" />
            {". "}
            {t("overview.bar.shortfallNote")}
          </>
        ) : (
          <>
            <span className="font-bold text-health-green">{t("overview.bar.surplusLabel")}</span>{" "}
            <Money amount={-p.gap} className="font-bold text-health-green" />
            {". "}
            {t("overview.bar.surplusNote")}
          </>
        )}
      </p>
    </div>
  );
}

function LegendRow({
  label,
  amount,
  swatch,
}: {
  label: string;
  amount: number;
  swatch: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 text-sm">
      {swatch}
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="ml-auto">
        <Money amount={amount} className="whitespace-nowrap font-bold text-card-foreground" />
      </dd>
    </div>
  );
}
