---
name: mhandisi-makini-design-system
description: Apply the MHANDISI MAKINI brand and design system (Site Yellow / Charcoal construction-PM identity, tagline "Let's build together") to any UI, web page, document, report, slide, or marketing asset. Use whenever building or reviewing something that carries the MHANDISI MAKINI brand, or when asked for its colours, typography, spacing, components, logo rules, or English/Swahili interface copy.
---

# MHANDISI MAKINI Design System

Brand guidelines v1.1 (September 2026), encoded for implementation.

MHANDISI MAKINI is Swahili for "Very Keen Engineer" — a construction project
management app for the site engineer. The brand expresses **attentiveness,
precision and care**. Official tagline: **Let's build together** (exact wording,
sentence case, straight apostrophe).

**Design intent in one line:** order without clutter — present the current
situation and the next action.

## How to use this skill

1. Read this file for the rules that apply to what you are building.
2. Pull the exact values from `references/tokens.css` (CSS custom properties) or
   `references/tailwind-preset.js` — never retype hex values from memory.
3. For UI work, read `references/components.md` for component specs.
4. For any user-facing text, read `references/voice-and-copy.md`.
5. Before you call the work done, run `references/review-checklist.md`.

Logo artwork lives in `assets/`. See "Logo" below — it is a raster concept, not
a vector master; treat it as a single image asset.

---

## 1. Colour

| Token | Hex | Role |
|---|---|---|
| Site Yellow | `#FFBE00` | Brand accent; primary action fill. Nothing else. |
| Charcoal | `#292D30` | Text, headings, dark surfaces |
| White | `#FFFFFF` | Main surfaces and clear space |
| Concrete | `#F5F6F7` | Page background and panels |
| Slate | `#56616B` | Secondary text, metadata, borders |

Status colours — these carry **meaning, never decoration**:

| Token | Hex |
|---|---|
| Success | `#18794E` |
| Warning | `#8A5800` |
| Error | `#B42318` |
| Info | `#175CD3` |

**Composition guide: ~70% white or pale neutral, ~20% charcoal, ~10% yellow.**
It is a balance, not a quota. Dense app screens should use *less* yellow, not
more. Yellow marks the one thing the engineer should do next; if two things on
a screen are yellow, one of them is wrong.

### Legible pairings (contrast ratios verified)

Use these:

| Foreground on background | Ratio | Verdict |
|---|---|---|
| Charcoal on Site Yellow | 8.34:1 | ✅ primary button |
| White on Charcoal | 13.89:1 | ✅ dark panels, headers |
| Charcoal on White | 13.89:1 | ✅ body text |
| Charcoal on Concrete | 12.83:1 | ✅ body on page bg |
| Slate on White | 6.33:1 | ✅ secondary text |
| Slate on Concrete | 5.85:1 | ✅ secondary text |
| Status colours on White | 5.4–6.6:1 | ✅ all four pass AA |
| Status colours on Concrete | 5.0–6.1:1 | ✅ all four pass AA |

Never use these:

| Combination | Ratio |
|---|---|
| White on Site Yellow | 1.66:1 ❌ |
| Site Yellow on White | 1.66:1 ❌ |

Yellow text is not a thing in this system. Yellow is a *fill* that carries
charcoal text. If you need an accent colour for text, use charcoal weight or a
status colour with a word next to it.

**Colour alone must never carry meaning.** Every status colour is paired with a
readable label — "Overdue", "Complete", "Action needed" — and, where it helps,
an icon. A bare coloured dot is a defect.

---

## 2. Typography

Primary family: **DejaVu Sans**. Regular for body, Bold for headings and
critical labels. One family, used consistently.

- App / web fallback stack: `"DejaVu Sans", -apple-system, BlinkMacSystemFont,
  "Segoe UI", Roboto, Helvetica, Arial, sans-serif`
- Office document fallback: **Arial**

The logo lettering is **artwork**, separate from this type system. Never retype
the wordmark in DejaVu Sans and call it the logo.

| Role | App / web | Print |
|---|---|---|
| Hero / campaign headline | 32–40 px Bold | 28–34 pt Bold |
| Page title | 28 px Bold | 24–27 pt Bold |
| Section heading | 20 px Bold | 15–18 pt Bold |
| Body | 16 px Regular, 1.5 line height | 11 pt, 1.15–1.3 |
| Label / metadata | 14 px Regular or Bold | 9–10 pt Regular |

### Typesetting rules

- **Sentence case** for headings, buttons and navigation. "Daily site report",
  not "DAILY SITE REPORT".
- Uppercase is reserved for the logo and short category labels only.
- Left-align working content. Centre only short cover or campaign titles.
- Avoid condensed type, italics for long passages, and paragraphs set entirely
  in capitals.
- Establish a reading order: strong heading, quieter project details, readable
  body. If every line is bold and oversized, nothing is emphasised.
- Regular weight for paragraphs; bold selectively.

### Data and localisation

- Keep units next to values: `25 m²`, `12 mm`, `TZS 150,000`.
- Unambiguous dates: `06 Sep 2026`. Never `06/09/26`.
- Align numerical columns consistently.
- Let text wrap in English **and Swahili** — Swahili strings run longer. Never
  truncate an essential instruction to fit a fixed box; adjust the layout.

---

## 3. Layout and spacing

- **8 px base spacing unit**, 4 px for small adjustments. All spacing is a
  multiple of 8 (or 4 where genuinely needed).
- Mobile pages: 16 px outer margins. Larger screens: 24–32 px.
- Keep related information close; separate major sections by **at least 24 px**.
- Cards: white surface, subtle border, **8 px corner radius**, **16 px internal
  padding**.
- Print: generous margins, consistent left alignment.

The structure comes from plans and site records — clean alignment, useful
annotation, deliberate emphasis.

---

## 4. Components

Full specs in `references/components.md`. The rules that matter most:

- **Primary action** — Site Yellow fill, charcoal bold label. **One dominant
  action per view.** Two equally prominent yellow buttons is a defect.
- **Secondary action** — white fill, charcoal border and charcoal text.
- **Cards** — white surface, subtle border, 8 px radius, 16 px padding.
- **Inputs** — persistent visible label *above* the field, visible border,
  helper text and error message below. Placeholders never replace labels.
- **Interaction** — 48 × 48 px minimum target. Visible keyboard focus state on
  everything interactive.
- **Navigation** — stable labels and icon positions; indicate the active
  section with more than colour (weight, underline, indicator bar).

### Icons

Simple engineering-inspired **outline** icons on a 24 px grid, ~2 px strokes.
Match stroke weight, corner treatment and optical size across the whole set.
Use familiar symbols for reports, tasks, people and project information, and
label unfamiliar ones. **The brand mark is not the default icon for every
feature.**

### Patterns and graphics

Faint blueprint grids, linework or restrained yellow bands as *secondary*
elements — behind non-essential areas, away from small text. Draw technical
diagrams accurately; a decorative drawing must never resemble an approved
construction detail.

---

## 5. Voice and copy

Write like a capable colleague who knows the site engineer has limited time.
**Start with what happened or what the user needs to do.**

- Active verbs, specific nouns, short sentences.
- Describe the problem *and* a useful next step.
- Personality: capable, attentive, composed, direct.

Avoid: blame, exaggerated urgency, jargon, construction cartoons, and
unsupported promises — "zero delays", "guaranteed safety", "perfect project
control", "best app ever".

**Naming:** `MHANDISI MAKINI` in formal brand references; `Mhandisi Makini` in
running prose where title case is needed. The name is unchanged in English and
Swahili.

**Honesty rules:** Never say "Saved" or "Submitted" before the action is
confirmed. If local saving and syncing both exist, distinguish them. Don't guess
the cause of an error — for a confirmed connection failure say "Report not
submitted. Check your connection and try again."; for an unknown failure say
"Report not submitted. Try again." Never expose a raw error code as the only
explanation.

Bilingual string table (EN / SW) is in `references/voice-and-copy.md`. Match the
selected interface language throughout a screen; don't switch languages without
a reason. Swahili terminology should be reviewed with intended users before
release.

---

## 6. Logo

The mark combines three meanings: the **hard hat** (site work, engineering
responsibility), the **gear** (coordination, moving parts of a project), and the
**checkmark** (follow-through, completed work).

Primary signature is the **stacked** lockup: icon above the two-line uppercase
name. Preserve the exact spelling `MHANDISI MAKINI`, the existing alignment and
relative proportions. **Treat it as a single image asset — never retype the
wordmark.**

- **Clear space:** let X = the visible height of the yellow hard-hat brim. Keep
  at least **2X** of empty space on every side, including below the wordmark.
  Measure from the artwork, not the edges of its image canvas.
- **Minimum size:** stacked logo 160 px on screen / 35 mm in print. Icon-only
  32 px / 10 mm. These are provisional — test the actual export at final size
  and enlarge if the letters, checkmark or gear gaps lose clarity.

| Placement | Rule |
|---|---|
| White or pale background | Primary yellow-and-charcoal signature |
| Dark background | Primary logo on a white holding panel with full clear space, until a reversed master exists |
| Photography | Plain white panel, away from busy detail |
| Single-colour print | Approved one-colour master; never rely on automatic grayscale conversion |
| App icon / favicon | Dedicated symbol-only export. Never squeeze the full name into a tiny square |

**Never** stretch, rotate, recolour, add shadows to, change the wordmark of,
move the checkmark within, or separate the hat from the gear. Never place a
slogan inside the mark. **Never use the checkmark to imply that a safety
inspection or technical approval occurred.**

**Tagline placement:** "Let's build together" sits *outside* the logo's clear
space, visually smaller than the brand name. On small applications, omit it
rather than let it become unreadable.

### Asset status — read before shipping

The supplied logo is a **raster concept**, not a production vector master. A
faithful vector reconstruction with outlined lettering is still a deliverable.
When you need a variant that does not exist (horizontal, reversed, mono, app
tile), say so rather than improvising one:

- Future horizontal lockup: symbol left, name right, optically centred, 2X gap.
- Future app tile: charcoal square, simplified yellow/white symbol, central safe
  area ~70% of the canvas.

Files in `assets/`:

| File | Use |
|---|---|
| `logo-stacked-dark-bg.png` | Reference only — dark-background concept |
| `logo-stacked-light-bg.png` | Primary signature on white/pale surfaces |
| `logo-app-tile.png` | App icon / favicon concept |
| `logo-horizontal.png` | Horizontal lockup concept |

---

## 7. Applications

Every application preserves the same hierarchy: **brand → purpose → essential
information → next action.**

- **App launch / sign-in:** white launch screen, primary signature, generous
  clear space. On sign-in the logo is secondary to the form. Yellow primary
  button with charcoal label. Prefer an instruction over a slogan.
- **Reports and covers:** logo upper-left or centred, above minimum print size.
  Then report title, project name, report date, author, revision. Charcoal
  headings, white pages, small yellow accents. Page numbers and project ID on
  long reports. Status and approval fields explicit.
- **Social / launch (1080 × 1080):** keep important text within a ≥64 px inset.
  One headline, one clear visual, one call to action. Example: "A clearer view
  of your site." / "Construction project management for the site engineer."
  Only say "Join the waitlist" if a working waitlist exists.
- **Signage and workwear:** full signature where reading distance permits, on a
  plain panel with generous clear space. For embroidery or small helmet decals,
  commission a simplified production master and proof the gear gaps and
  checkmark at actual size. **Keep branding away from required safety markings
  and equipment identification.**
- **Partner branding:** each logo gets its own clear space; align by perceived
  visual weight, not identical image-box dimensions. Separate identities with
  space or a subtle divider. Describe the relationship accurately — never imply
  an endorsement or certification.

---

## 8. Do / Don't quick reference

| Do | Don't |
|---|---|
| Charcoal text on yellow buttons | White text on yellow |
| One dominant action per view | Two competing equal-weight actions |
| Sentence case headings | Blocks of uppercase body copy |
| Persistent labels above fields | Placeholders standing in for labels |
| Status colour + word | A coloured dot alone |
| "Report not submitted. Try again." | "Error 1042" |
| Quiet surface around the signature | Headlines crossing the mark |
| Yellow concentrated in symbol + key accents | Decorative yellow on every surface |
| Claims that match the shipped product | "Zero delays", "best app ever" |

---

## 9. Governance

One brand owner approves new logo masters, palette changes, taglines and
external campaign templates. Designers and developers use a **shared component
and token source** — this skill is that source for code. Record version, date,
reason and approver for each revision; archive superseded assets so they cannot
be mistaken for current files.

Open decisions from v1.1: confirm the typeface, appoint the brand owner,
complete the production logo masters, and validate bilingual interface language
and real-device usability with site engineers before launch.

When something in this system conflicts with a specific request, say so and
offer the compliant alternative rather than silently breaking the brand.
