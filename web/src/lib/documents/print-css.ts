/**
 * The print stylesheet for the three issued documents (ticket 10 §2 / ADR 0005).
 *
 * The `--mm-*` brand primitives are copied **verbatim** from the single source
 * of truth, `.claude/skills/mhandisi-makini-design-system/references/tokens.css`
 * — the same values `src/app/globals.css` copies for the app screens. This is
 * the one sanctioned duplication: a headless-Chromium document cannot `@import`
 * the Tailwind-built `globals.css`, so the primitives are inlined here. Never
 * hardcode a brand hex anywhere in a template — read these variables.
 *
 * Layout is deliberately plain: normal document flow, no `position: fixed`
 * running elements. Page furniture (the business name and "page X of Y") is
 * supplied by Puppeteer's `footerTemplate` for the PDF; the JPG re-renders with
 * a `.screenshot` body class that swaps in an in-flow footer and a fixed width.
 */

export const PRINT_CSS = `
:root {
  /* --- Brand palette (verbatim from tokens.css) ----------------------- */
  --mm-yellow: #FFBE00;
  --mm-charcoal: #292D30;
  --mm-white: #FFFFFF;
  --mm-concrete: #F5F6F7;
  --mm-slate: #56616B;
  --mm-yellow-pressed: #E6AB00;
  --mm-border: #E3E5E7;
  --mm-border-strong: #C7CBCF;
  --mm-success: #18794E;
  --mm-warning: #8A5800;
  --mm-error: #B42318;
  --mm-error-surface: #FDF0EF;

  /* --- Semantic roles ---------------------------------------------------- */
  --mm-bg: var(--mm-white);
  --mm-surface: var(--mm-white);
  --mm-text: var(--mm-charcoal);
  --mm-text-secondary: var(--mm-slate);

  /* --- Typography ------------------------------------------------------ */
  --mm-font: "DejaVu Sans", -apple-system, BlinkMacSystemFont, "Segoe UI",
    Roboto, Helvetica, Arial, sans-serif;
  --mm-size-page-title: 1.75rem;
  --mm-size-section: 1.25rem;
  --mm-size-body: 1rem;
  --mm-size-label: 0.875rem;
  --mm-weight-regular: 400;
  --mm-weight-bold: 700;
  --mm-leading-heading: 1.2;
  --mm-leading-body: 1.5;

  /* --- Spacing / shape ----------------------------------------------- */
  --mm-space-1: 4px;
  --mm-space-2: 8px;
  --mm-space-3: 12px;
  --mm-space-4: 16px;
  --mm-space-5: 24px;
  --mm-space-6: 32px;
  --mm-radius: 8px;
  --mm-radius-sm: 4px;
}

* { box-sizing: border-box; }

html, body {
  margin: 0;
  padding: 0;
  background: var(--mm-white);
  color: var(--mm-text);
  font-family: var(--mm-font);
  font-size: 11pt;
  line-height: var(--mm-leading-body);
  font-weight: var(--mm-weight-regular);
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}

.doc {
  position: relative;
  max-width: 100%;
}

/* --- Letterhead ---------------------------------------------------------- */
.letterhead {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: var(--mm-space-4);
  padding-bottom: var(--mm-space-3);
  border-bottom: 3px solid var(--mm-yellow);
}
.letterhead__brand {
  display: flex;
  align-items: center;
  gap: var(--mm-space-3);
}
.letterhead__logo {
  height: 40px;
  width: auto;
  max-width: 160px;
  object-fit: contain;
}
.letterhead__name {
  font-size: var(--mm-size-page-title);
  font-weight: var(--mm-weight-bold);
  line-height: var(--mm-leading-heading);
  margin: 0;
}
.letterhead__contact {
  font-size: var(--mm-size-label);
  color: var(--mm-text-secondary);
  text-align: right;
  white-space: nowrap;
}
.letterhead__contact p { margin: 0; }
.letterhead__contact p + p { margin-top: 2px; }
.letterhead__tagline {
  font-size: var(--mm-size-label);
  color: var(--mm-text-secondary);
  margin-top: 2px;
}

/* --- Document heading -------------------------------------------------- */
.dochead {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: var(--mm-space-4);
  margin-top: var(--mm-space-5);
}
.dochead__title {
  font-size: var(--mm-size-section);
  font-weight: var(--mm-weight-bold);
  margin: 0;
  text-transform: none;
}
.dochead__number {
  font-size: var(--mm-size-body);
  font-weight: var(--mm-weight-bold);
}

/* --- Meta grid ------------------------------------------------------- */
.meta {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--mm-space-1) var(--mm-space-5);
  margin-top: var(--mm-space-4);
  padding: var(--mm-space-3) 0;
  border-top: 1px solid var(--mm-border);
  border-bottom: 1px solid var(--mm-border);
  font-size: var(--mm-size-label);
}
.meta__item { display: flex; gap: var(--mm-space-2); }
.meta__label { color: var(--mm-text-secondary); min-width: 92px; }
.meta__value { font-weight: var(--mm-weight-bold); }

/* --- Section tables ------------------------------------------------- */
.section { margin-top: var(--mm-space-5); break-inside: avoid; }
.section__title {
  font-size: var(--mm-size-body);
  font-weight: var(--mm-weight-bold);
  margin: 0 0 var(--mm-space-2);
}
table.lines {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--mm-size-label);
}
table.lines th {
  text-align: left;
  font-weight: var(--mm-weight-bold);
  color: var(--mm-text-secondary);
  border-bottom: 1px solid var(--mm-border-strong);
  padding: var(--mm-space-2) var(--mm-space-2) var(--mm-space-2) 0;
}
table.lines td {
  padding: var(--mm-space-2) var(--mm-space-2) var(--mm-space-2) 0;
  border-bottom: 1px solid var(--mm-border);
  vertical-align: top;
}
table.lines .num { text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; }
table.lines .desc { color: var(--mm-text-secondary); font-size: 0.8rem; }
table.lines tfoot td {
  font-weight: var(--mm-weight-bold);
  border-bottom: none;
  border-top: 2px solid var(--mm-charcoal);
  padding-top: var(--mm-space-2);
}
tr { break-inside: avoid; }

/* --- Grand total ---------------------------------------------------- */
.total {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-top: var(--mm-space-4);
  padding: var(--mm-space-3);
  background: var(--mm-charcoal);
  color: var(--mm-white);
  border-radius: var(--mm-radius-sm);
  break-inside: avoid;
}
.total__label { font-weight: var(--mm-weight-bold); }
.total__value { font-weight: var(--mm-weight-bold); font-size: var(--mm-size-body); font-variant-numeric: tabular-nums; }

/* --- Callouts ------------------------------------------------------ */
.callout {
  margin-top: var(--mm-space-4);
  padding: var(--mm-space-3);
  background: var(--mm-concrete);
  border-left: 3px solid var(--mm-border-strong);
  border-radius: var(--mm-radius-sm);
  font-size: var(--mm-size-label);
  break-inside: avoid;
}
.callout__title {
  font-weight: var(--mm-weight-bold);
  margin: 0 0 var(--mm-space-1);
}
.callout p { margin: 0; }
.callout--fee { border-left-color: var(--mm-yellow); }

.block { margin-top: var(--mm-space-4); font-size: var(--mm-size-label); break-inside: avoid; }
.block__title { font-weight: var(--mm-weight-bold); margin: 0 0 var(--mm-space-1); }
.block p { margin: 0; white-space: pre-wrap; }

/* --- Diagonal lifecycle stamp ------------------------------------- */
.stamp {
  position: absolute;
  top: 42%;
  left: 50%;
  transform: translate(-50%, -50%) rotate(-22deg);
  font-size: 64pt;
  font-weight: var(--mm-weight-bold);
  letter-spacing: 0.08em;
  color: var(--mm-error);
  border: 6px solid var(--mm-error);
  border-radius: var(--mm-radius);
  padding: 0.1em 0.35em;
  opacity: 0.18;
  pointer-events: none;
  white-space: nowrap;
  text-transform: uppercase;
}
.stamp--paid { color: var(--mm-success); border-color: var(--mm-success); }

/* --- Screenshot (JPG) variant ------------------------------------ */
body.screenshot {
  width: 210mm;
  padding: 16mm;
  background: var(--mm-white);
}
body.screenshot .doc__footer {
  margin-top: var(--mm-space-6);
  padding-top: var(--mm-space-3);
  border-top: 1px solid var(--mm-border);
  font-size: var(--mm-size-label);
  color: var(--mm-text-secondary);
  display: flex;
  justify-content: space-between;
}
body:not(.screenshot) .doc__footer { display: none; }

@page { size: A4; }
`;
