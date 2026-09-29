/**
 * The Report Export template (tickets "What an exported report is" and
 * "Export formats and whether filters carry into them") — one template for all
 * six Reports and both Statements, driven by the shared table model
 * (`@/lib/reports/export-table`) so the PDF, JPG and CSV never disagree.
 *
 * It carries the Issued Document letterhead but is deliberately *not* an Issued
 * Document: no number, no lifecycle stamp, an "As of" line, and a footnote
 * saying it is not an invoice or request for payment. Financial Summary keeps
 * its "working ledger" extras (a blank Notes column and a Reviewed-by / Date /
 * Signature line) — space to write on at a site meeting, not an issue
 * signature.
 *
 * Plain function components only: rendered with `renderToStaticMarkup`.
 */
import { formatTZS } from "@/lib/finance";
import { INTL_TAG } from "@/lib/i18n/locales";
import { type ExportCell, type ExportModel, reportTitle } from "@/lib/reports/export-table";
import { EXPORT_TIME_ZONE } from "@/lib/reports/export-filename";

import type { ReportExportDocument } from "./load";

/** "29 Sep 2026, 14:05 EAT" in the viewer's language. */
export function formatAsOf(at: Date, locale: ReportExportDocument["locale"]): string {
  const text = new Intl.DateTimeFormat(INTL_TAG[locale], {
    timeZone: EXPORT_TIME_ZONE,
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  })
    .format(at)
    .replace("Sept", "Sep");
  return `${text} EAT`;
}

function Cell({ value, money }: { value: ExportCell; money?: boolean }) {
  if (value == null || value === "") return <td className={money ? "num" : undefined}>—</td>;
  if (money && typeof value === "number") return <td className="num">{formatTZS(value)}</td>;
  return <td className={money ? "num" : undefined}>{value}</td>;
}

export function ReportExportDoc({ doc, model }: { doc: ReportExportDocument; model: ExportModel }) {
  const { t, profile, filterState } = doc;
  const ledger = doc.kind === "financial-summary";
  const filtered = filterState.active.length > 0;

  return (
    <div className="doc">
      <header className="letterhead">
        <div className="letterhead__brand">
          {profile.logoDataUrl ? (
            // Rendered by Puppeteer from a static HTML string: a data: URI is
            // the whole point (no asset server to fetch from).
            // eslint-disable-next-line @next/next/no-img-element
            <img className="letterhead__logo" src={profile.logoDataUrl} alt="" />
          ) : null}
          <div>
            <p className="letterhead__name">{profile.businessName}</p>
            <p className="letterhead__tagline">Let&rsquo;s build together</p>
          </div>
        </div>
        <div className="letterhead__contact">
          <p>{profile.phone}</p>
          <p>{profile.email}</p>
        </div>
      </header>

      <div className="dochead">
        <h1 className="dochead__title">{reportTitle(doc.kind, t)}</h1>
      </div>
      {doc.addressee ? <p className="addressee">{doc.addressee}</p> : null}
      <p className="asof">{t("reportExport.asOf", { date: formatAsOf(doc.asOf, doc.locale) })}</p>
      {filtered ? (
        <p className="filtered">
          <b>{t("reportExport.filtered")}:</b>{" "}
          {filterState.active.map((f) => f.label).join(" · ")}
          {filterState.dateRangeActive ? ` · ${t("reportExport.figuresAsOfToday")}` : ""}
        </p>
      ) : null}

      {doc.meta.length > 0 ? (
        <dl className="meta">
          {doc.meta.map((m) => (
            <div className="meta__item" key={m.label}>
              <dt className="meta__label">{m.label}</dt>
              <dd className="meta__value">{m.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}

      {model.headlines.length > 0 ? (
        <div className="figures">
          {model.headlines.map((h) => (
            <div key={h.label}>
              <p className="figure__label">{h.label}</p>
              <p className={`figure__value${h.alert ? " figure__value--alert" : ""}`}>
                {formatTZS(h.amount)}
              </p>
            </div>
          ))}
        </div>
      ) : null}

      {model.tables.map((table) => (
        <section className="section report-section" key={table.title}>
          <h2 className="section__title">{table.title}</h2>
          {table.rows.length === 0 ? (
            <p className="empty">{t("reportExport.noRows")}</p>
          ) : (
            <table className="lines report">
              <thead>
                <tr>
                  {table.columns.map((c) => (
                    <th key={c.label} className={c.money ? "num" : undefined}>
                      {c.label}
                    </th>
                  ))}
                  {ledger ? (
                    <th className="notes">{t("reports.financialSummary.printSheet.notes")}</th>
                  ) : null}
                </tr>
              </thead>
              <tbody>
                {table.rows.map((row, i) => (
                  <tr key={i}>
                    {row.map((cell, j) => (
                      <Cell key={j} value={cell} money={table.columns[j]?.money} />
                    ))}
                    {ledger ? <td className="notes">&nbsp;</td> : null}
                  </tr>
                ))}
              </tbody>
              {table.total ? (
                <tfoot>
                  <tr>
                    {table.total.map((cell, j) =>
                      cell == null ? (
                        <td key={j} />
                      ) : (
                        <Cell key={j} value={cell} money={table.columns[j]?.money} />
                      ),
                    )}
                    {ledger ? <td /> : null}
                  </tr>
                </tfoot>
              ) : null}
            </table>
          )}
        </section>
      ))}

      {ledger ? (
        <div className="sign">
          <span>{t("reports.financialSummary.printSheet.reviewedBy")}</span>
          <span>{t("reports.financialSummary.printSheet.date")}</span>
          <span>{t("reports.financialSummary.printSheet.signature")}</span>
        </div>
      ) : null}

      <p className="footnote">{t("reportExport.footer")}</p>

      <footer className="doc__footer">
        <span>{profile.businessName}</span>
        <span>Let&rsquo;s build together</span>
      </footer>
    </div>
  );
}
