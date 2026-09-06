# Design System Master File

> **LOGIC:** When building a specific page, first check `design-system/pages/[page-name].md`.
> If that file exists, its rules **override** this Master file.
> If not, strictly follow the rules below.

---

**Project:** Mhandisi Makini
**Source of truth:** the `mhandisi-makini-design-system` skill
(`.claude/skills/mhandisi-makini-design-system/`) — Brand Guidelines v1.1
(September 2026). This file is a working summary; the skill's `references/`
(`tokens.css`, `components.md`, `voice-and-copy.md`, `review-checklist.md`) win
on any conflict.
**Category:** Construction project management, for the site engineer.
**Tagline:** Let's build together (exact wording, sentence case, straight apostrophe).
**Design intent:** order without clutter — present the current situation and the
next action. Composition ≈ 70% white/pale, 20% charcoal, 10% yellow.

The runtime tokens live in `src/app/globals.css`. Never hardcode a brand hex
anywhere else — read the CSS variables.

---

## Global Rules

### Colour palette

| Role | Hex | CSS variable | Use |
|------|-----|--------------|-----|
| Site Yellow | `#FFBE00` | `--mm-yellow` / `--color-accent` | Brand accent and the **one** primary action per view. Nothing else. |
| Charcoal | `#292D30` | `--mm-charcoal` / `--color-foreground` | Text, headings, dark surfaces, the app header |
| White | `#FFFFFF` | `--mm-white` / `--color-card` | Cards and clear space |
| Concrete | `#F5F6F7` | `--mm-concrete` / `--color-background` | Page background, panels |
| Slate | `#56616B` | `--mm-slate` / `--color-muted-foreground` | Secondary text, metadata, borders |

Status colours carry **meaning, never decoration**, and are always paired with a
word (and usually an icon):

| Meaning | Hex | CSS variable | Example label |
|---------|-----|--------------|---------------|
| Success | `#18794E` | `--mm-success` / `--color-health-green` | Complete |
| Warning | `#8A5800` | `--mm-warning` / `--color-health-amber` | Action needed |
| Error | `#B42318` | `--mm-error` / `--color-health-red` / `--color-destructive` | Overdue |
| Info | `#175CD3` | `--mm-info` / `--color-health-blue` / `--color-ring` | In progress |

**Never:** white text on yellow (1.66:1) or yellow text on white (1.66:1).
Yellow is a *fill* that carries charcoal text — there is no yellow text in this
system. A bare coloured dot with no label is a defect.

**Dark variant:** `src/app/globals.css` carries an improvised charcoal-based
dark theme under `prefers-color-scheme: dark`. It is **not** part of Brand
Guidelines v1.1 — review with the brand owner before relying on it.

### Typography

- **One family throughout:** `"DejaVu Sans", -apple-system, BlinkMacSystemFont,
  "Segoe UI", Roboto, Helvetica, Arial, sans-serif` (`--mm-font`). Regular for
  body, Bold (700) for headings and critical labels. No separate heading face.
- Self-hosting the real DejaVu Sans face is an open follow-up; today the stack
  falls back to the platform UI font.

| Role | Size | Weight | Line height |
|------|------|--------|-------------|
| Hero / campaign | 36 px (32–40) | 700 | 1.2 |
| Page title (`h1`) | 28 px | 700 | 1.2 |
| Section heading (`h2`) | 20 px | 700 | 1.2 |
| Body | 16 px | 400 | 1.5 |
| Label / metadata | 14 px | 400 or 700 | — |

- **Sentence case** for headings, buttons and navigation. "Create daily report",
  not "DAILY SITE REPORT". Uppercase is reserved for the logo and short category
  labels — never a CSS `text-transform` on UI copy.
- Established money-position terms from `CONTEXT.md` ("Available Float", "Total
  Committed", "Petty Cash"…) keep their capitalisation as proper nouns.
- Left-align working content; centre only short cover / campaign titles.
- Keep units next to values (`25 m²`, `TZS 150,000`). Dates are unambiguous:
  `06 Sep 2026`, never `06/09/26` (`formatDate` in `src/lib/format.ts`).
- Let text wrap in English **and Swahili** — never truncate an essential
  instruction to fit a box.

### Spacing

8 px base unit, 4 px for micro adjustments — every value is a multiple of 8
(or 4). Mobile outer margin 16 px; larger screens 24–32 px. At least **24 px**
between major sections. Tokens `--mm-space-1` … `--mm-space-8`.

### Shape and shadow

- Radius: **8 px** for cards, buttons and inputs (`--mm-radius`); 4 px for small
  chips and status pills (`--mm-radius-sm`).
- **No shadows.** Separation comes from a 1 px border (`--color-border`) and the
  concrete background.

---

## Component Specs

### Buttons (`src/components/ui/Button.tsx`)

| | Primary | Secondary | Ghost | Danger-quiet |
|---|---|---|---|---|
| Fill | Site Yellow | White | none | none |
| Label | Charcoal, bold 16 px | Charcoal, bold 16 px | Slate, bold 14 px | Error, semibold 14 px |
| Border | none | 1 px charcoal | none | none |
| Radius / min height | 8 px / 48 px | 8 px / 48 px | — / 48 px | — / 48 px |

- **One dominant (primary) action per view.** Two equal yellow buttons is a
  defect. Everything else is secondary, ghost (wizard "Back", "Cancel") or
  danger-quiet ("Cancel order").
- Labels are a specific verb + object: "Create funding request", "Record
  delivery", "Issue to client" — never "Continue", "OK", "Go". Wizard forward
  buttons name the next step ("Continue to tasks").
- Sentence case. Disabled state must be distinguishable by more than colour.

### Cards (`src/components/ui/Card.tsx`)

White surface, 1 px border, 8 px radius, 16 px padding, no shadow. Group related
information in one card; separate cards by 24 px. A metric card
(`src/components/ui/StatTile.tsx`) is a quiet 14 px slate label above a large
bold value.

### Inputs (`src/components/ui/Field.tsx`)

Structure, top to bottom: **label → control → hint → error.**

- The label is persistent and visible above the field. A placeholder is never
  the label. Required fields are marked in the label (` (required)`).
- Visible 1 px border at rest, 48 px minimum height (`controlClass`).
- Errors sit next to the field and say how to recover ("Enter the supplier
  name."), not on submit alone.

### Status / badges

`colour + word`, optionally an icon; 4 px radius; bold. Health:
Comfortable / Tight / Underfunded / Funding pending
(`src/components/ui/HealthBadge.tsx`). Alerts pair a severity chip ("Action
needed" / "Attention" / "Note") with the message in normal text.

### Navigation and chrome

- The shared charcoal app header (`src/components/AppChrome.tsx`) carries the
  logo on a white holding panel on every working screen; it hides itself on
  `/welcome` and `/sign-in`.
- Active state is shown by **more than colour** — bold weight plus a yellow
  indicator bar / chip (see `StepIndicator`).

### Icons

Phosphor, regular (outline) weight, ~24 px, consistent across the set. The brand
mark is not the default icon for a feature.

### Interaction and accessibility

- 48 × 48 px minimum touch target.
- Visible keyboard focus everywhere: 2 px `#175CD3` outline, 2 px offset
  (global rule in `globals.css`). Never `outline: none` without a replacement.
- Layouts reflow rather than clip when text resizes.
- Test contrast and focus on a real device in bright outdoor conditions.

---

## Voice

Write like a capable colleague who knows the site engineer has limited time.
Start with what happened or what to do next. Active verbs, specific nouns, short
sentences. Describe the problem *and* a useful next step.

**Honesty rules (non-negotiable):**

- Never say "Saved" / "Submitted" / "Issued" before the action is confirmed. The
  prototype's mock flows say "Marked as issued" and state that syncing is not
  wired up.
- Distinguish local saving from syncing.
- Don't guess an error's cause. Confirmed connection failure → "Report not
  submitted. Check your connection and try again."; unknown → "Report not
  submitted. Try again." Never a raw error code as the only explanation.
- No unsupported claims about delays, safety or outcomes. No "zero delays",
  "best app ever".
- Never use the brand checkmark to imply an inspection or approval occurred.

**Naming:** `MHANDISI MAKINI` in formal references; `Mhandisi Makini` in running
prose. Never translated, abbreviated or hyphenated.

---

## Logo

- Treat the supplied artwork as a **single image asset** — never retype the
  wordmark in a font. Files in `public/brand/`: `logo-horizontal.png`,
  `logo-stacked.png`, `logo-app-tile.png` (favicon source).
- Clear space ≥ 2X the yellow hard-hat brim height on every side.
- Minimum size: stacked 160 px on screen; symbol-only 32 px.
- On the charcoal header, the logo sits on a white holding panel until a
  reversed master exists.
- The supplied art is a **raster concept**. A production vector master with
  outlined lettering, a reversed master, and a true horizontal lockup are still
  deliverables.
- Never stretch, rotate, recolour, shadow or rearrange the mark. Never put a
  slogan inside it. Tagline sits outside the clear space, smaller than the name,
  or is omitted when it would be unreadable.

---

## Pre-Delivery Checklist

Run `references/review-checklist.md` from the skill. In short:

- [ ] Only the five brand colours + four status colours. No stray hexes.
- [ ] No white-on-yellow, no yellow text.
- [ ] ~70% white/pale, 20% charcoal, 10% yellow; yellow marks the one next action.
- [ ] One family, sentence case, clear reading order, body 16 px / 1.5.
- [ ] Spacing on the 8 px scale; ≥ 24 px between sections; cards 8 px / 16 px / border.
- [ ] One dominant action per view; buttons name a verb + object.
- [ ] Every field has a persistent visible label; errors sit by the field.
- [ ] 48 px touch targets; visible keyboard focus; active nav shown by more than colour.
- [ ] Dates "06 Sep 2026"; units next to values; no success message before confirmation.
- [ ] No emojis as icons; Phosphor outline set throughout.
- [ ] Responsive at 375 / 768 / 1024 / 1440; no horizontal scroll on mobile.
- [ ] `prefers-reduced-motion` respected.
