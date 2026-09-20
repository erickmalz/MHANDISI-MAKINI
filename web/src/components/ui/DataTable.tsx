import type { ReactNode } from "react";

import { T } from "@/lib/i18n/client";

export type Column<Row> = {
  /** Stable key for the column. */
  key: string;
  /** Visible column header. Put the unit here when cells do not carry it. */
  header: string;
  /** Right-align figures so digits line up; text stays left. */
  align?: "left" | "right";
  /** Extra classes for the cell (e.g. `text-muted-foreground` for secondary text). */
  className?: string;
  /** What to show for this column in one row. */
  cell: (row: Row) => ReactNode;
  /** Content for this column's cell in the totals row, when there is one. */
  total?: ReactNode;
};

/**
 * The shared data table.
 *
 * - A real `<table>` with a screen-reader caption and `scope="col"` headers.
 * - Figures right-aligned (`tabular-nums` comes from `Money`), units next to
 *   values, a totals row in `<tfoot>` when any column supplies `total`.
 * - `responsive="stack"` (default, for read-only data): below `sm` every row
 *   becomes a labelled card — the first column is the card's title and the
 *   rest are label/value pairs — so nobody scrolls sideways on a phone. The
 *   content is rendered twice and CSS shows one, so do NOT put form controls
 *   in a stacked table (they would post twice).
 * - `responsive="scroll"`: one table that scrolls sideways in a focusable
 *   region. Use it when cells hold inputs.
 */
export function DataTable<Row>({
  caption,
  columns,
  rows,
  rowKey,
  totalLabel = <T k="common.total" />,
  responsive = "stack",
}: {
  caption: string;
  columns: Column<Row>[];
  rows: Row[];
  rowKey: (row: Row) => string;
  totalLabel?: ReactNode;
  responsive?: "stack" | "scroll";
}) {
  const hasTotals = columns.some((c) => c.total !== undefined);
  const firstTotal = columns.findIndex((c) => c.total !== undefined);

  const table = (
    <table className="w-full text-sm">
      <caption className="sr-only">{caption}</caption>
      <thead>
        <tr className="border-b border-border text-left text-muted-foreground">
          {columns.map((c, i) => (
            <th
              key={c.key}
              scope="col"
              className={`py-3 font-bold ${i < columns.length - 1 ? "pr-4" : ""} ${
                c.align === "right" ? "text-right" : ""
              }`}
            >
              {c.header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={rowKey(row)} className="border-b border-border last:border-0">
            {columns.map((c, i) => (
              <td
                key={c.key}
                className={`py-3 align-top ${i < columns.length - 1 ? "pr-4" : ""} ${
                  c.align === "right" ? "text-right" : ""
                } ${c.className ?? ""}`}
              >
                {c.cell(row)}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
      {hasTotals && (
        <tfoot>
          <tr className="border-t-2 border-border font-bold text-card-foreground">
            {firstTotal > 0 && (
              <th scope="row" colSpan={firstTotal} className="py-3 pr-4 text-left">
                {totalLabel}
              </th>
            )}
            {columns.slice(Math.max(firstTotal, 0)).map((c, i, rest) => (
              <td
                key={c.key}
                className={`py-3 ${i < rest.length - 1 ? "pr-4" : ""} ${
                  c.align === "right" ? "text-right" : ""
                }`}
              >
                {c.total}
              </td>
            ))}
          </tr>
        </tfoot>
      )}
    </table>
  );

  if (responsive === "scroll") {
    return (
      <div
        role="region"
        aria-label={caption}
        tabIndex={0}
        className="overflow-x-auto rounded-lg"
      >
        {table}
      </div>
    );
  }

  const [primary, ...rest] = columns;
  return (
    <>
      <div className="hidden sm:block">{table}</div>
      <ul className="flex flex-col gap-3 sm:hidden" aria-label={caption}>
        {rows.map((row) => (
          <li key={rowKey(row)} className="rounded-lg border border-border p-3">
            <div className="font-bold text-card-foreground">{primary.cell(row)}</div>
            <dl className="mt-2 grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 text-sm">
              {rest.map((c) => (
                <div key={c.key} className="contents">
                  <dt className="text-muted-foreground">{c.header}</dt>
                  <dd className={`text-right ${c.className ?? ""}`}>{c.cell(row)}</dd>
                </div>
              ))}
            </dl>
          </li>
        ))}
        {hasTotals && (
          <li className="rounded-lg border-2 border-border p-3">
            <p className="font-bold text-card-foreground">{totalLabel}</p>
            <dl className="mt-2 grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 text-sm font-bold">
              {columns
                .filter((c) => c.total !== undefined)
                .map((c) => (
                  <div key={c.key} className="contents">
                    <dt className="font-normal text-muted-foreground">{c.header}</dt>
                    <dd className="text-right text-card-foreground">{c.total}</dd>
                  </div>
                ))}
            </dl>
          </li>
        )}
      </ul>
    </>
  );
}
