/**
 * Shared building blocks for the three document templates (ticket 10 §2).
 *
 * Every one of these is a plain function component — no hooks, no client
 * boundary — because the templates are turned into an HTML string with
 * `renderToStaticMarkup` and handed to Chromium. Money and dates are formatted
 * only through `formatTZS` / `formatDate`, the same helpers the app screens use.
 */
import type { ReactNode } from "react";

import type { DocumentSnapshotSection } from "@/lib/data/schema/snapshot";
import { formatTZS } from "@/lib/finance";
import { formatDate } from "@/lib/format";

import type { DocumentProfile } from "@/lib/data/documents";

export interface MetaItem {
  label: string;
  value: string;
}

/** The letterhead + document heading + meta grid + footer wrapper. */
export function Shell({
  profile,
  title,
  number,
  stamp,
  meta,
  children,
}: {
  profile: DocumentProfile;
  title: string;
  number: string;
  stamp: string | null;
  meta: MetaItem[];
  children: ReactNode;
}) {
  return (
    <div className="doc">
      {stamp ? (
        <div
          className={`stamp${stamp.startsWith("PAID") ? " stamp--paid" : ""}`}
          aria-hidden="true"
        >
          {stamp}
        </div>
      ) : null}

      <header className="letterhead">
        <div className="letterhead__brand">
          {profile.logoDataUrl ? (
            // Puppeteer renders this from a static HTML string, outside Next's
            // image pipeline; a data: URI is the whole point here (no asset
            // server to fetch).
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
        <h1 className="dochead__title">{title}</h1>
        <span className="dochead__number">{number}</span>
      </div>

      <dl className="meta">
        {meta.map((m) => (
          <div className="meta__item" key={m.label}>
            <dt className="meta__label">{m.label}</dt>
            <dd className="meta__value">{m.value}</dd>
          </div>
        ))}
      </dl>

      {children}

      <footer className="doc__footer">
        <span>{profile.businessName}</span>
        <span>Let&rsquo;s build together</span>
      </footer>
    </div>
  );
}

/** One priced section rendered as a table with a subtotal row. */
export function SectionTable({
  section,
  showUnitColumns = true,
}: {
  section: DocumentSnapshotSection;
  showUnitColumns?: boolean;
}) {
  return (
    <section className="section">
      <h2 className="section__title">{section.title}</h2>
      <table className="lines">
        <thead>
          <tr>
            <th>Description</th>
            {showUnitColumns ? <th className="num">Qty</th> : null}
            {showUnitColumns ? <th>Unit</th> : null}
            {showUnitColumns ? <th className="num">Unit price</th> : null}
            <th className="num">Amount</th>
          </tr>
        </thead>
        <tbody>
          {section.lines.map((line, i) => (
            <tr key={i}>
              <td>
                {line.label}
                {line.description ? (
                  <div className="desc">{line.description}</div>
                ) : null}
              </td>
              {showUnitColumns ? (
                <td className="num">{line.qty ?? "—"}</td>
              ) : null}
              {showUnitColumns ? <td>{line.unit ?? "—"}</td> : null}
              {showUnitColumns ? (
                <td className="num">
                  {line.unitCost != null ? formatTZS(line.unitCost) : "—"}
                </td>
              ) : null}
              <td className="num">{formatTZS(line.amount)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={showUnitColumns ? 4 : 1}>Subtotal</td>
            <td className="num">{formatTZS(section.subtotal)}</td>
          </tr>
        </tfoot>
      </table>
    </section>
  );
}

/** The charcoal grand-total bar. */
export function GrandTotal({ label, amount }: { label: string; amount: number }) {
  return (
    <div className="total">
      <span className="total__label">{label}</span>
      <span className="total__value">{formatTZS(amount)}</span>
    </div>
  );
}

/** A grey/yellow callout box. */
export function Callout({
  title,
  children,
  variant,
}: {
  title?: string;
  children: ReactNode;
  variant?: "fee";
}) {
  return (
    <div className={`callout${variant === "fee" ? " callout--fee" : ""}`}>
      {title ? <p className="callout__title">{title}</p> : null}
      <p>{children}</p>
    </div>
  );
}

/** A plain titled text block (notes, payment instructions). */
export function TextBlock({ title, body }: { title: string; body: string }) {
  return (
    <div className="block">
      <p className="block__title">{title}</p>
      <p>{body}</p>
    </div>
  );
}

/** "06 Sep 2026" from an ISO (YYYY-MM-DD) snapshot date. */
export function isoToDisplay(iso: string): string {
  return formatDate(iso);
}
