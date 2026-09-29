/**
 * Report Export additions on top of the Issued Document stylesheet
 * (`../print-css.ts`, which stays the base: letterhead, dochead, meta, tables,
 * brand tokens). Appended after it, so these rules win where they overlap.
 *
 * A4 **landscape** — report tables are wide (ticket "Export formats and
 * whether filters carry into them", Round 2). Paper stays white with charcoal
 * ink; literal brand tokens only, never the app's dark-mode-aware ones.
 */
export const REPORT_CSS = /* css */ `
@page { size: A4 landscape; }

/* JPG: the same page as one continuous landscape-width image. */
body.screenshot.landscape { width: 297mm; }

.asof {
  margin: var(--mm-space-1) 0 0;
  font-size: var(--mm-size-label);
  font-weight: var(--mm-weight-bold);
}
.filtered {
  margin: var(--mm-space-1) 0 0;
  font-size: var(--mm-size-label);
  color: var(--mm-text-secondary);
}
.filtered b { color: var(--mm-text); }
.addressee {
  margin: var(--mm-space-2) 0 0;
  font-size: var(--mm-size-section);
  font-weight: var(--mm-weight-bold);
}

.figures {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: var(--mm-space-3) var(--mm-space-5);
  margin-top: var(--mm-space-4);
  padding: var(--mm-space-3) var(--mm-space-4);
  border: 1px solid var(--mm-border);
  border-radius: var(--mm-radius-sm);
  break-inside: avoid;
}
.figure__label { margin: 0; font-size: 0.75rem; color: var(--mm-text-secondary); }
.figure__value {
  margin: 2px 0 0;
  font-weight: var(--mm-weight-bold);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
.figure__value--alert { color: var(--mm-error); }

/* Wide landscape tables: denser type, zebra rows, header repeats per page. */
table.lines.report { font-size: 0.78rem; }
table.lines.report thead { display: table-header-group; }
table.lines.report tr { break-inside: avoid; }
table.lines.report tbody tr:nth-child(even) { background: var(--mm-concrete); }
table.lines.report .notes { width: 18%; }
.section.report-section { break-inside: auto; }
.empty { margin: var(--mm-space-2) 0 0; color: var(--mm-text-secondary); font-size: var(--mm-size-label); }

/* Financial Summary "working ledger": space to write on at a site meeting. */
.sign {
  display: flex;
  gap: 48px;
  margin-top: 36px;
  font-size: var(--mm-size-label);
  break-inside: avoid;
}
.sign span { flex: 1; border-top: 1px solid var(--mm-charcoal); padding-top: 6px; }

.footnote {
  margin-top: var(--mm-space-5);
  font-size: 0.75rem;
  color: var(--mm-text-secondary);
}
`;
