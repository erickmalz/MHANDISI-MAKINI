# Frontend design audit — Mhandisi Makini

Audit date: 20 Sep 2026. Scope: the whole `web/` frontend (57 pages, about 11,400 lines of TSX, the shared UI kit, global CSS, the server-rendered PDF templates).

Method: read the code and the brand system (`mhandisi-makini-design-system`, Brand Guidelines v1.1), ran pattern scans across every page, and computed contrast ratios from the real token values. I did not run the app or take screenshots, because it needs the database. Every claim below cites a file or a measured number. Real-device testing in sunlight, which the brand checklist requires, is still outstanding.

## Verdict

The foundation is stronger than most products at this stage. It has a token layer that matches the brand exactly, a small disciplined UI kit, honest copy, sentence case, `formatDate` and `formatTZS` helpers, status badges that always pair colour with a word and icon, and PDF/JPG export for issued documents.

What keeps it from reading as international-standard is not the look. The look is already right. It is five things underneath the look:

1. The brand font is never actually delivered to the browser.
2. Several accessibility measurements fail WCAG 2.2 AA (focus ring, input borders, touch targets, announcements).
3. There is no project-level navigation, so pages are islands with a back link and up to nine controls in a header.
4. Common patterns are re-implemented per page instead of being components, which is why small inconsistencies keep appearing.
5. The reliability layer is missing: no error boundaries, no success/error feedback pattern, and most pages share one browser tab title.

**I do not recommend a visual redesign.** The brief pins the direction (Site Yellow, Charcoal, DejaVu Sans, one dominant action per view, roughly 70/20/10 composition). A distinctive identity already exists and is documented. The job is to make the product meet that identity everywhere and to add the structure a professional product needs.

## What to keep

| Keep | Where |
|---|---|
| Token system copied verbatim from the brand, with a "never hardcode a hex" rule that is actually followed (zero stray hexes in TSX) | `src/app/globals.css` |
| `Field` wiring: persistent label, `aria-invalid`, `aria-describedby`, hint then error order | `src/components/ui/Field.tsx` |
| `HealthBadge`: colour, icon and word together, with plain labels ("Comfortable", "Tight", "Underfunded") | `src/components/ui/HealthBadge.tsx` |
| Empty states that invite an action ("Create your first project") | `src/app/(app)/page.tsx` |
| Reversed logo lockup on charcoal with an `sr-only` name | `src/components/AppChrome.tsx` |
| `tabular-nums` on money, unambiguous dates | `Money.tsx`, `lib/format.ts` |
| `prefers-reduced-motion` respected in the loaders | `PageLoaders.module.css:197` |
| Server-side PDFs that ship DejaVu via `fonts-dejavu-core` | `Dockerfile:25` |

---

## Priority 1 — Fix these first (correctness and accessibility)

### 1.1 DejaVu Sans is named but never loaded

`--mm-font` starts with `"DejaVu Sans"`, but there is no `@font-face`, no `next/font`, and no font file in `public/`. On most user devices DejaVu is not installed, so the UI silently renders in Segoe UI, San Francisco or Roboto. The PDFs, rendered in Docker, do use DejaVu, so screen and paper currently look like different brands.

**Fix:** self-host DejaVu Sans Regular and Bold as WOFF2 through `next/font/local` (no third-party request, no layout shift, `font-display: swap`). Subset to Latin plus the Swahili characters. Keep the existing fallback stack. Two weights only, as the brand specifies.

The brand file says the typeface is still an "open decision" in v1.1. If the brand owner would rather choose a different family, this is the moment. Whichever family is chosen, it must actually ship.

### 1.2 Focus ring fails on the charcoal header

`--mm-focus-ring` is Info blue `#175CD3`. Measured contrast:

| Ring on | Ratio | WCAG 2.2 needs 3:1 |
|---|---|---|
| White | 5.99:1 | pass |
| Site Yellow | 3.60:1 | pass |
| Charcoal header `#292D30` | **2.32:1** | **fail** |
| Dark-mode page `#1B1E20` | **2.80:1** | **fail** |

Every header control (logo link, Switch project, Settings, Sign out) has a nearly invisible keyboard focus. A keyboard user on the busiest bar in the app cannot see where they are.

**Fix:** a two-tone ring. Keep blue on light surfaces. Inside `.bg-surface-inverse` (and dark mode) switch the ring to white (13.89:1) or Site Yellow (8.34:1). One `:where(.surface-inverse) :focus-visible` rule fixes all of it.

### 1.3 Input borders are almost invisible

`controlClass` uses `--mm-border-strong` `#C7CBCF`, which is **1.63:1** against white. The brand rule says inputs need a "visible border", and WCAG 1.4.11 requires 3:1 for the boundary of a control. Cards at `#E3E5E7` (1.26:1) are fine because the brand calls for "subtle", but a text field is a control, not a card.

**Fix:** darken only the control border. `#858E96` gives 3.33:1 on white and 3.08:1 on Concrete. It is a derived support tint like the existing border tints, so it stays inside the palette rules. Slate `#56616B` at 5.9:1 also works if a stronger, more engineered look is preferred.

### 1.4 Errors and confirmations are not announced

Across 30 forms, the only `role="status"` / `aria-live` in the whole codebase are the two loaders. The sign-in error (`sign-in/page.tsx:92`), the `Field` error paragraph (`Field.tsx:69`) and server-action errors are plain `<p>` elements. A screen-reader user submits, hears nothing, and does not know it failed. Sighted users also get no success confirmation: there is no toast or notice component at all.

**Fix:** a `Notice` component (`role="status"` for success, `role="alert"` for errors, icon plus text, dismissible). Move focus to the first invalid field or an error summary on failed submit (WCAG 3.3.1). Follow the brand honesty rules: say "Saved" only after confirmation, and use "Funding request not saved. Try again." for unknown failures.

### 1.5 No error boundaries

`find` shows only `loading.tsx` in `(app)` and `admin`, and one `not-found.tsx`. There is no `error.tsx` or `global-error.tsx` anywhere. A failed database call or a thrown server action shows the framework's default error screen, on the one product whose brand promise is "attentiveness, precision and care".

**Fix:** `app/error.tsx`, `app/(app)/error.tsx` and `app/global-error.tsx`, in the brand voice: what happened, what to do next, one yellow "Try again" button, a secondary "Choose a project". Never show a raw error code as the only explanation.

### 1.6 Touch targets under 48 px

The brand and WCAG 2.5.8 both set a floor (brand 48 px, WCAG 24 px minimum). The kit mostly meets it, and several real controls do not:

- Header "Switch project", "Settings", "Sign out": `px-3 py-2 text-sm` is about 36 px tall (`AppChrome.tsx:49,58`, `SignOutButton.tsx:58`).
- Stage card links "Tasks", "Edit", "Work this stage": no `min-h-12` (`StageList.tsx:70-90`).
- Number inputs in tables and rows: `min-h-10` (40 px), 14 occurrences, for example `PurchaseOrderDetail.tsx:452`.
- The inline "Sign out" link on the verification screen (`EmailVerificationGate.tsx:63`) is bare bold text with no padding.

On site, with gloves or in sunlight, this matters more than on a desk.

### 1.7 Type under 14 px, and the one uppercase label

40 uses of `text-xs` (12 px) against a brand minimum of 14 px for labels and metadata. Worst cases are the form labels in `SurplusMaterialsForm.tsx:92,101` (12 px labels above 16 px inputs), the status text under report rows, and all inline task or funding status chips. `financial-check/page.tsx:152` is also the only `uppercase tracking-wide` in the app, and it breaks the sentence-case rule.

**Fix:** raise the smallest size to 14 px (`text-sm`) app-wide, and delete `text-xs` from the codebase with a lint rule. Sentence-case the financial-check tile labels.

### 1.8 One browser-tab title for almost everything

Only 6 of 57 pages set metadata. Everything else is titled "Mhandisi Makini — Construction project management". With several tabs open ("Kigamboni Residences", a funding request, a purchase order) the engineer cannot tell them apart, and screen-reader users lose the page announcement (WCAG 2.4.2).

**Fix:** a title template in the root layout (`%s — Mhandisi Makini`) and a `generateMetadata` or `metadata` export per page: "FR-004 Interior finishes · Kigamboni Residences".

### 1.9 Placeholders doing a label's job

`FundingRequestForm.tsx:186-270` and `SurplusMaterialsForm.tsx` use placeholder-only line items ("Item", "Qty", "Unit", "Unit cost"). They carry `aria-label`, so screen readers are covered, but sighted users lose the label the moment they type a value, exactly the failure the brand's "placeholders never replace labels" rule targets. "Reason to void" (4 places) is the same.

**Fix:** for repeating rows on wide screens use a single header row of visible column labels above the inputs (a real table or a CSS grid with a header). On narrow screens stack labelled fields inside each row's card.

---

## Priority 2 — Structure and information architecture

This is where the largest gain in "professional" comes from.

### 2.1 Add project navigation

There is no `<nav>` landmark anywhere in the app. Inside a project the only wayfinding is a "Choose another project" back link. The brand checklist requires an active-section indicator "more than colour", which is impossible to satisfy today because no navigation exists to indicate.

The project dashboard header (`projects/[id]/page.tsx:51-121`) carries **nine controls**: three quiet text links (Edit project, Save as template, Project closeout), five equal white secondary buttons (Material stock, Purchase orders, Funding requests, Activity history, Reports), and one yellow primary. Five equal-weight buttons in a wrapping row tell the engineer nothing about which matters, and they wrap unpredictably at tablet widths.

**Proposal**, using the existing vocabulary:

```
[logo]                              Switch project · Settings · Sign out     <- charcoal chrome
------------------------------------------------------------------------
Kigamboni Residences  [Tight]        KGB-2026-01 · Client name · Site
                                                     [ + Create funding request ]  <- the one yellow action
Overview | Funding requests | Purchase orders | Material stock | Reports | Activity
=========                                                            <- charcoal underline + bold on the active tab
```

- A horizontal project sub-navigation under the title, with the active tab shown by a 3–4 px charcoal underline plus bold weight, not colour.
- On phones it scrolls horizontally with a visible fade at the edge, and keeps 48 px tabs.
- Edit project, Save as template and Project closeout move into a single "Project actions" menu (a disclosure button). They are rare, so they should not compete with daily work.
- "Create funding request" stays the single yellow action on the Overview. On other tabs the primary changes to that tab's action ("New purchase order", "Add material"), which keeps the one-dominant-action rule.

### 2.2 Breadcrumbs for depth

Task edit is four levels deep (Project → Stage → Task → Edit) and the only cue is a back link that shows the parent's name. Add a breadcrumb trail (`<nav aria-label="Breadcrumb">`, `aria-current="page"` on the last item) above the page title in one `PageHeader` component (see 3.1). It also fixes the second problem: today the chrome does not show which project is open.

### 2.3 Lead the dashboard with "the situation and the next action"

The brand's own one-line intent is "order without clutter — present the current situation and the next action." The Overview currently opens with the header of nine controls, then five money tiles of near-equal weight, then a "Breakdown" of nine rows, then a Supervisor fee section, then stages and alerts. The next action is only visible if the engineer scrolls to Alerts at the bottom right.

**Proposal:**

1. A status band directly under the title: the `HealthBadge` plus one sentence, and the top alert's action beside it. For example: *"Underfunded by TZS 4,200,000. Request funding before the next delivery on 24 Sep."* with a link to the offending item. The alerts data already exists (`project.alerts`), so this is presentation of existing data, not a new feature.
2. **One hero figure.** Make Available Float the large number (it is the most decision-relevant), and set the other four as quiet supporting figures beside it. Today `emphasis` is applied to two of the five tiles, which weakens both.
3. Replace the abstract tiles with **one honest chart**: a single stacked bar (or bullet bar) of Client deposited → Paid → Open commitments → Remaining expected, so "where the money stands" is seen at a glance. Use only the data the app holds. Do not add trend lines or "vs last month" deltas: the app has no time series and no forecasting model behind them.
4. Keep Breakdown and Supervisor fee below the fold as expandable detail, and keep the supervisor fee visually separate (it is its own ledger).

### 2.4 One page frame

Content widths vary by page: `max-w-3xl` (21 uses), `4xl` (18), `5xl` (7), `6xl` (4). The logo sits at the left of a 6xl container, so on the picker (3xl) and stage (5xl) pages the content's left edge is not aligned with the logo. Alignment is the brand's stated source of order ("clean alignment").

**Fix:** two frames only. A **reading frame** (`max-w-3xl`, forms and single records) and a **working frame** (`max-w-6xl`, dashboards and tables). Left-align both to the chrome container, not centred narrower inside it.

### 2.5 The project picker will not scale

`(app)/page.tsx` is a good start (attention-flagged, one at a time). With 12 or more projects it becomes an unsorted list. Add: sort with attention first, a text filter once there are more than about 6 projects, and a small "active / closed" split. Keep it a picker, not a portfolio view: the app works one project at a time, so no cross-project figures. Move the three reference registers into the chrome or Settings area, since they are not part of choosing a project.

### 2.6 Loading strategy

`SurveySweepLoader` is a full-page centred mark shown for every navigation under `(app)`. It is on-brand and well built, but showing the logo animation on every page change makes the app feel slower and hides the layout. Recommend: keep the branded loader for first load and sign-in, and use content **skeletons** (grey blocks in the shape of the card or table) for route-level `loading.tsx`. The loader stays a delight, and navigation stops feeling like a reload.

---

## Priority 3 — Components (remove the copy-paste)

Repeated code is the direct cause of the inconsistencies above. Recommended shared components:

| Component | Why (evidence) |
|---|---|
| `PageHeader` (breadcrumb, title, meta, one primary, action menu) | `text-[1.75rem]` is hard-coded in 57 places; each page builds its own back link and action row |
| `ProjectNav` | see 2.1 |
| `LinkButton` / `Button variant="quiet"` | the string `inline-flex min-h-12 items-center gap-1 px-2 text-sm font-bold text-muted-foreground hover:text-foreground` appears verbatim in 8 files, and near-variants elsewhere, some without `min-h-12` |
| One `StatusBadge` with a status map | four separate badges (`HealthBadge`, `FRStatusBadge`, `POStatusBadge`, `VariationStatusBadge`) plus inline `rounded bg-muted px-2 py-0.5 text-xs` for task and stage status, which have no icon and use a different radius |
| `DataTable` | 8 hand-written tables, none with `<caption>` or `scope="col"`, none with a sticky header, and horizontal scroll with no affordance on phones |
| `MoneyInput` | 25 `type="number"` inputs and 0 `inputMode`. Typing TZS `12500000` with no thousands grouping is where errors and mis-keyed zeros happen |
| `Notice` / toast | see 1.4 |
| `ConfirmDialog` | destructive and void actions are inline forms with a text box. A modal or inline confirm with a consequence sentence is the international norm for irreversible finance actions |
| `Skeleton` | see 2.6 |
| Radius token | `rounded-lg` (70), `rounded-md` (27), `rounded` (16), `rounded-full` (3). The brand says 8 px for cards, so define two roles (control/card 8 px, badge 4 px) and stop using `rounded-md` |

Notes on specific components:

- **`DataTable`:** right-align numbers with `tabular-nums`, keep units in the header ("Amount (TZS)"), and on screens under about 640 px turn each row into a labelled card instead of scrolling sideways. Site engineers read on phones.
- **`MoneyInput`:** show the `TZS` prefix, use `inputMode="decimal"`, group thousands on blur, and never rely on the mouse wheel changing the value.
- **`StatTile`:** two weights only (hero, supporting). The local `StatTile` inside `financial-check/page.tsx` duplicates the name of the shared one with different behaviour, so rename or merge.

---

## Priority 4 — Professional polish and international readiness

### 4.1 Swahili is a brand promise the frontend does not keep

The brand system ships an EN/SW string table and states that Swahili strings run longer and must wrap. The app has one language: `lang="en"`, every string hard-coded, no i18n library. Retrofitting later costs far more than adding it now.

**Recommend:** adopt a message catalogue (for example `next-intl`) before the page count grows, extract strings page by page starting with auth, chrome and the picker, and set `lang` per locale. Test long Swahili strings in buttons and tabs (the new tab bar is where they will break first). Have real users review the Swahili terminology, as the brand asks.

### 4.2 Built for the phone on site: manifest, offline honesty

There is no web app manifest, so it cannot be installed to a home screen, and `logo-app-tile.png` exists but is not wired to one. Add `app/manifest.ts` (name, `theme_color` charcoal, icons from the reversed symbol on charcoal at 65–70% fill, per the brand's app-icon rule). Do not add offline editing without a design for it: if local saving and syncing ever both exist, the brand says to distinguish them in words, and an app that shows "Saved" over a dropped connection is worse than one that says "Not saved. Check your connection and try again."

### 4.3 Decide about dark mode

`globals.css` includes a dark theme labelled "an improvised extension, NOT part of Brand Guidelines v1.1". It is only partly wired (2 `dark:` usages in the whole app), and it raises the focus-ring failure at 1.2. A half-supported, unreviewed theme is a risk in a product whose value is trust. Pick one: either remove the media query until the brand owner approves a dark variant, or complete it (logo swap already exists, so status, tile and border pairs need review, and contrast of the derived dark tints must be re-verified). I recommend removing it for now and revisiting after the fixes above.

### 4.4 Motion

Every button has `active:scale-[0.97]` plus a yellow wash. That press feedback is a good, user-triggered cue. The gap is that only the loader honours `prefers-reduced-motion`. Add one global `@media (prefers-reduced-motion: reduce)` rule that removes transforms and transitions.

### 4.5 Skip link and landmarks

Add a "Skip to main content" link as the first focusable element (WCAG 2.4.1), give the chrome a `<nav aria-label="Account">`, and keep one `<main id="main">` per page (already true).

### 4.6 Screen and paper parity

Once DejaVu ships to the browser (1.1), the on-screen record and its PDF/JPG export match. Also render one sample of each issued document beside its on-screen view at review time. These are the outward-facing records a client or bank will read.

### 4.7 Stale copy

`welcome/page.tsx:33-35` still says "Just looking? Open the prototype". That is not a promise the shipped product should make, and it links to the signed-in picker. Remove it or replace it with a factual line. The brand rule is that claims match the shipped product.

---

## On the `ui-redesigns/` mockups

The three images (`midnight-obsidian`, `blueprint-aurora`, `golden-pulse`) were reviewed. They are attractive, but I recommend **not** adopting them as a direction:

| Issue | Why it matters |
|---|---|
| Near-black backgrounds with gold gradients and glow | The brand composition is about 70% white or pale, 20% charcoal, 10% yellow. These invert it. Yellow is glowing on most surfaces |
| Different taglines ("Solid people stronger tomorrow", "Building a brighter Tanzania") | The only approved tagline is "Let's build together" |
| Trend charts, "vs last month" deltas, a milestone calendar, donut charts by trade | None of that data exists in the product. Unsupported figures on a finance screen erode the trust the product sells |
| Photographic site imagery behind headings | Fine for a marketing page, but it puts imagery behind working data and small text |
| Project switcher plus a "Projects" nav | Conflicts with the one-project-at-a-time model |

**Worth salvaging:** the persistent left/top navigation, the breadcrumb, the status pill beside the project title, and the compact "financial position" band with one hero figure. All four are in Priority 2 above, expressed in the brand's own light system.

---

## Suggested order of work

| Phase | Contents | Effort |
|---|---|---|
| **A. Correctness** (1–2 days) | 1.1 font delivery, 1.2 focus ring, 1.3 input border tint, 1.7 min type size and uppercase, 1.8 titles, 4.4 reduced motion, 4.5 skip link, 4.7 stale copy | Small, mostly CSS and config |
| **B. Reliability** (2–3 days) | 1.4 `Notice` plus form error announcement, 1.5 error boundaries, 1.6 touch targets, 1.9 labelled line items | Medium |
| **C. Structure** (about 1 week) | 2.1 `ProjectNav`, 2.2 breadcrumbs plus `PageHeader`, 2.4 page frames, 3 `LinkButton` / `StatusBadge` / radius tokens | Medium |
| **D. Dashboard** (3–4 days) | 2.3 status band, hero figure, position bar; 2.5 picker sorting and filter; 2.6 skeletons | Medium, needs design review |
| **E. Data entry** (about 1 week) | `DataTable`, `MoneyInput`, `ConfirmDialog` | Larger, touches many forms |
| **F. Reach** (ongoing) | 4.1 Swahili catalogue, 4.2 manifest, 4.3 dark-mode decision | Needs a brand-owner decision |

Phases A and B change no layouts and can ship as small, low-risk pull requests. I would start there.

## Status — Phase A (20 Sep 2026)

Done, typechecked, linted and built (`next build` passes):

| Item | Result |
|---|---|
| 1.1 Font delivery | DejaVu Sans Regular and Bold self-hosted via `next/font/local` (Latin subset, 12 KB each), wired to `--mm-font`. Licence kept in `src/app/fonts/DejaVu-LICENSE.txt`. Verified: `@font-face` rules are in the built CSS, with an Arial size-adjusted fallback. |
| 1.2 Focus ring | White ring inside the charcoal header (13.89:1); lighter blue in dark mode. |
| 1.3 Input borders | New `--mm-control-border` `#858E96` (3.33:1) on `controlClass` and the inline inputs in `PurchaseOrderDetail` and `FundingRequestDetail`. **Correction:** this did not actually render until Phase B. See the layering bug below. |
| 1.7 Type size | All 40 `text-xs` uses are now `text-sm`; the uppercase financial-check label is sentence case; an ESLint rule blocks `text-xs` and sub-14 px sizes from returning. Small badges keep their shorter height. |
| 1.8 Page titles | Title template `%s — Mhandisi Makini`; a static title on every page (sign-in, sign-up, verify-email and task edit through small layout files). Detail pages use type-level titles ("Purchase order"). Putting the record name in the title needs `generateMetadata` and would repeat data queries, so it is left for later. |

Left for the owner of the in-progress task-edit work: `tasks/[taskId]/edit/_components/LabourPaymentsCard.tsx:165` still uses the old input border (`border-border-strong`); change it to `border-control-border` when that file is committed.

## Status — Phase B (20 Sep 2026)

Done, typechecked, linted, built, and checked in a real headless browser (20 checks, all passing).

**A bug found on the way, and its fix.** The base rule `* { border-color: … }` in `globals.css` was not inside a cascade layer. Unlayered CSS beats every Tailwind utility, so **no `border-<colour>` class had ever applied**: input borders, the secondary button's charcoal border (the brand's spec), the header's `border-white/40`, hover borders, and the darker dashed empty states all rendered in the pale card colour. The Phase A border change looked done in the code but was not visible on screen. The base rules now sit in `@layer base`, so utilities win as intended. Expect secondary buttons and inputs to look noticeably crisper across the app. That is the brand's intended look.

| Item | Result |
|---|---|
| 1.4 Announced errors | New `Notice` component (`error` = `role="alert"`, `success`/`info` = `role="status"`, always icon plus words). 22 forms and dialogs now use it. `Field` errors are `role="alert"`. `FocusFirstInvalid` (mounted once in the root layout) moves focus to the first invalid field of the form that was just submitted, for both client checks and Server Action errors. |
| 1.5 Error boundaries | `app/error.tsx`, `app/(app)/error.tsx` and `app/global-error.tsx`, sharing one `ErrorScreen`: what happened, "Try again" (uses this Next version's `retry`), "Choose a project", a quotable reference, no raw error text. Focus lands on the heading. |
| 1.6 Touch targets | Every control that was 32–40 px is now 48 px: header links, Sign out, stage-card links, "Edit draft" links, filter chips, photo Remove, all icon-only remove buttons (48 × 48), and the inline inputs. |
| 1.9 Labelled rows | New `LineField`. Visible labels now sit above every field in the funding request, purchase order, task and stage template line items, and the surplus materials and void-reason inputs. The surplus form's old labels were not connected to their inputs at all. |
| Dead colour classes | `bg-mm-warning-surface`, `text-mm-warning`, `text-mm-success`, `text-mm-error` do not exist in the theme, so the verify-email banner had no background and its success and error messages had no colour. Replaced with real tokens and announced notices. |

Not done, and why: `tasks/[taskId]/edit/_components/LabourPaymentsCard.tsx` is in-progress work and was left alone. It still needs `border-control-border` on its void-reason input, `min-h-12` on its two controls, a `Notice` for its errors, and a `LineField` label.

## Status — Phase C: structure (20 Sep 2026)

Done, typechecked, linted, built and checked in a real browser (22 checks; the one miss was a selector in my test, and the behaviour it targeted worked).

| Item | Result |
|---|---|
| 2.1 Project navigation | New project layout (`projects/[id]/layout.tsx`) renders a `ProjectBar`: project name, code, client and site, six section tabs, and a **Project actions** menu holding Edit project, Save as template and Project closeout. The active tab has a 3 px charcoal underline plus bold weight and `aria-current`. Stages, tasks, variations and closeouts keep Overview active. Tabs are 48 px, scroll sideways on a phone with the active one centred. The Overview header went from nine controls to one primary action. |
| 2.2 Breadcrumbs | `Breadcrumbs` and `PageHeader` are on every page except the in-progress task edit page. Trail: Overview, then the stage or record. Top-level tabs have none. Registers and Settings start at "Projects". |
| 2.4 One page frame | `PageFrame` replaces six one-off widths. Everything shares the app header's container, so the logo, project name, tabs and page title share one left edge (measured). `reading` (4xl) for forms and single records; `working` (full) for lists, tables and dashboards; every top-level tab is `working` so width does not jump. Admin pages use it too. |
| Skip link | "Skip to main content" is the first focusable element and targets `#main`. |
| Shared components | `StatusBadge` (four badge components now sit on it, plus the inline chips), `Button variant="ghost"` replaces 24 copies of the same link classes, and the radius scale is two roles: 8 px controls and cards, 4 px badges. |
| Stage page | "Run Financial Check" stays visible; Edit stage and Stage closeout move to a **Stage actions** menu; Add task is the one primary. |

**Bugs found on the way:**

- `ProjectNav` first used `scrollIntoView`, which makes Chrome start keyboard navigation from the active tab, so the first Tab press skipped the skip link. Replaced with a direct scroll position.
- `globals.css` also carried unlayered `.sr-only` and `.tabular-nums` copies that would beat Tailwind's own utilities (including `focus:not-sr-only` on the skip link). Removed.
- An unrelated type-check trap: the generated `.next/dev/types/validator.ts` from a running dev server can get corrupted, and when any file has a syntax error `tsc` skips semantic checks entirely, so a "clean" `tsc` proves nothing. Type-check with a config that excludes `.next/dev`.

## Status — Phase D: dashboard, picker and loading (20 Sep 2026)

Built by a parallel agent and integrated in the same pass. Verified in the browser with dummy data.

| Item | Result |
|---|---|
| 2.3 Overview | Opens with a status band (health badge, one plain sentence such as "Underfunded by TZS 38,000,000. The remaining work costs more than the Available Float.", and the most urgent alert with its link). One hero figure (Available Float, 36 px) with four quiet supporting figures. One position bar drawn only from existing financials: Paid (solid), Open commitments (hatched), Remaining expected (striped) against a marked client-deposit line, with a legend in words and amounts and a text alternative. No trend line and no "vs last month". Breakdown is collapsed; the supervisor fee stays its own ledger. |
| 2.5 Picker | Projects needing attention first, then the rest. A text filter appears only above six projects. Each row shows identity, health badge and alert count only; no figures side by side. |
| 2.6 Loading | A `Skeleton` set and route-level `loading.tsx` shaped like each page (12 routes), motion off for reduced-motion users. The branded loader stays for the first load. |
| Tests | 14 unit tests for the overview and picker logic (`tests/ui`). |

## Status — Phase E: data table, money input, and the last loose ends (20 Sep 2026)

Done, linted, tested (23 unit tests) and built. Checked in a real browser at 1280, 768 and 390 px (23 checks, all passing). Two parts were built by parallel agents and integrated.

| Item | Result |
|---|---|
| `DataTable` | One shared table. A real `<table>` with a screen-reader caption, `scope="col"` headers, right-aligned figures, units next to values, and a totals row. Below `sm` each row becomes a labelled card (the first column is its title) with a totals card at the end, so nobody scrolls sideways on a phone. Tables that hold inputs use `responsive="scroll"` (one table in a focusable, scrollable region) so form fields are never rendered twice. All 9 tables now use it: the six reports, material stock, and both purchase order tables. |
| `MoneyInput` | A text field with the numeric keypad, a visible "TZS" prefix, no spinner or scroll-wheel changes, cleanup of pasted "TZS 1,250,000", and thousands grouping once you leave the field. The form and `onChange` only ever receive plain digits (a hidden field carries them). `allowNegative` for variation impacts. Used in 13 places across 9 forms: funding request, purchase order, task (unit cost and labour agreement), stage fee, variation impacts, deposits, supplier payments and labour payments. Rules live in `lib/money-input.ts` with 9 tests. Decimal quantity fields also get the numeric keypad. |
| Labour payments card and task edit page (agent) | Presentation only, behaviour untouched: money input for the amount, a labelled and 48 px void-reason field, `Notice` errors, and the page moved to `PageFrame` and `PageHeader` with breadcrumbs. |
| Reference registers in the header (agent) | A "Registers" menu (Supplier register, Subcontractor register, Stage templates) in the app header on every screen, marked current on those routes. On phones one "Menu" button holds the email, registers, Settings and Sign out inside the viewport. The header stays one 64 px row at every width. The registers section is gone from the picker page. |

## Status — Phase F: Kiswahili (20 Sep 2026)

Built with three parallel agents plus the shared infrastructure. Linted, 34 unit tests passing, built, and checked in a real browser (28 checks) on the public pages and on probe pages holding the shared components, the dashboard and a long form.

**How it works.** No new dependency and no `/sw/` in URLs. The reader's language is a cookie (`mm_locale`); if there is none, the browser's `Accept-Language` decides; then English. A typed catalogue (`web/src/lib/i18n/messages/en` and `sw`) makes the compiler fail until every English string has a Kiswahili one. Server Components use `await getT()`, Client Components use `useT()`. The `<html lang>` follows the language, and dates follow it too (`06 Ago 2026`). Plurals use each language's own rules. A sentence that contains a link (`I accept the {terms} and {privacy}`) keeps the translator's word order.

**Coverage.** 1,164 strings in 22 areas: sign-in, sign-up, verification, welcome, reset password, the 404 and error pages, the header and project bar, the project picker, the whole Overview, projects, stages, tasks and site diary, funding requests, purchase orders, variations, all reports, material stock, activity, settings, suppliers, subcontractors, stage templates, financial check and both closeouts. Language can be changed from the header (a one-tap button; inside the phone "Menu"), from Settings, and on every sign-in and sign-up screen. Verified: no horizontal overflow at 390 px in Kiswahili, and the health, tab, header and form text all wrap instead of clipping.

**Guard rails.** `tests/ui/i18n.test.ts` fails if Kiswahili is missing a key, has an empty string, drops a `{placeholder}`, or is a copy of the English (unless allow-listed on purpose). A lint rule (`react/jsx-no-literals`) warns about any hardcoded text left in the screens: it is at zero for the translated areas.

**Review.** Every Kiswahili string is a draft. `docs/swahili-review.md` (regenerate with `npx tsx scripts/i18n-review.ts`) lists all of them side by side with a reviewer column and starts with eleven terminology questions. The brand guidelines require this review with site engineers before release.

**Not translated yet (known gaps, with the plan in `web/src/lib/i18n/README.md`):** validation and error text returned by Server Actions (signup is done and shows how), alert texts on the Overview, activity history event text, financial-check findings, issued PDFs/JPGs and e-mails, the legal pages, and the platform admin screens.

**Also found and fixed.** The welcome page still offered "Open the prototype" (removed). Signup used to show better-auth's raw English error text; it now maps to two catalogue messages. Material stock formatted dates in the browser's language by accident.

## Not done, and why

- Server-produced text in Kiswahili (see Phase F above).
- Title case on domain terms ("Run Financial Check", "Stage Closeout") was kept because the glossary capitalises them; revisit if the brand owner wants pure sentence case.

## Open questions for the brand owner

1. Confirm DejaVu Sans as the shipped typeface (open decision in v1.1). It should be delivered either way.
2. Approve a mid-tone control-border tint (`#858E96` proposed) as a new support token.
3. Approve or remove the dark theme.
4. Confirm Swahili is in scope for the first public release, since that decides whether 4.1 is urgent.
