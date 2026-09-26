---
name: "mhandisi-makini-design-system"
description: "Apply the Mhandisi Makini design system (helmet yellow #FFB800 on charcoal #252A2D, Manrope + Inter, tagline \"Let's build together\") to any UI, component, page, document or marketing asset — tokens, components, logo rules, EN/SW copy."
---

# Mhandisi Makini Design System

Implementation source of truth for the Mhandisi Makini web app (September 2026). It supersedes Brand Guidelines v1.1: its colours (#FFBE00 / #292D30 / Concrete #F5F6F7), DejaVu Sans type and 8px radius are retired. Check this file before you invent a colour, spacing value, component variant or interaction pattern.

**The name:** Mhandisi Makini is Swahili for "Very Keen Engineer".
**What it is:** a trusted construction-services platform that connects people with skilled professionals (electrical, plumbing, building, finishing) for safer, smarter, stronger communities.
**Brand promise:** trusted construction help, made approachable.
**Personality:** capable, welcoming, practical, optimistic. It should feel like a professional site supervisor who is easy to talk to.
**Core visual idea:** deep charcoal gives structure and trust, helmet yellow marks action and energy, and light neutral surfaces keep text readable.
**Tagline:** "Let's build together". Use this exact wording, in sentence case, with a straight apostrophe in code. Keep it in English unless a translation is approved.

## 1. Tokens: always use these CSS variables

```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Manrope:wght@600;700;800&display=swap');

:root {
  /* Brand */
  --mm-yellow-500: #ffb800;  /* primary action, active nav, rating stars */
  --mm-yellow-600: #e6a600;  /* hover / pressed */
  --mm-charcoal-900: #252a2d;/* brand dark, headings, sidebar, hero */
  --mm-charcoal-800: #343a3f;/* active nav bg, hover on charcoal */
  /* Neutrals */
  --mm-white: #ffffff;
  --mm-canvas: #f7f8f6;      /* page background */
  --mm-surface: #ffffff;     /* cards, inputs */
  --mm-border: #dce1e5;
  --mm-text: #252a2d;
  --mm-text-muted: #5e6872;  /* Slate: supporting text */
  --mm-text-subtle: #7b858e; /* large text / non-text marks only */
  /* Semantic: status only, always with a word or icon */
  --mm-success: #168a56;  --mm-success-bg: #e9f7ef;
  --mm-info: #2667d9;     --mm-info-bg: #eaf1ff;
  --mm-warning: #a96800;  --mm-warning-bg: #fff3db;
  --mm-error: #d64545;    --mm-error-bg: #feebeb;
  /* Focus */
  --mm-focus: #2667d9;
  --mm-focus-ring: 0 0 0 3px rgba(38, 103, 217, 0.28);
  /* Spacing: 8px rhythm; 4px only for icon/text alignment */
  --mm-space-1: 4px;  --mm-space-2: 8px;  --mm-space-3: 12px; --mm-space-4: 16px;
  --mm-space-5: 20px; --mm-space-6: 24px; --mm-space-8: 32px; --mm-space-10: 40px;
  --mm-space-12: 48px; --mm-space-16: 64px;
  /* Shape */
  --mm-radius-sm: 8px; --mm-radius-md: 12px; --mm-radius-lg: 16px; --mm-radius-pill: 999px;
  --mm-shadow-card: 0 4px 18px rgba(37, 42, 45, 0.08);
  --mm-shadow-float: 0 12px 32px rgba(37, 42, 45, 0.14);
  /* Type */
  --mm-font-heading: 'Manrope', system-ui, sans-serif;
  --mm-font-body: 'Inter', system-ui, sans-serif;
  /* Layout */
  --mm-sidebar-width: 240px; --mm-content-max: 1440px;
  --mm-touch-target: 44px;   --mm-input-height: 48px;
  --mm-duration-fast: 160ms; --mm-duration-overlay: 200ms;
}
```

Tailwind: map these tokens in `theme.extend` (`colors.mm.yellow.500: 'var(--mm-yellow-500)'`, `borderRadius.mm: 'var(--mm-radius-md)'`, `fontFamily.heading/body` and so on). Don't paste raw hex values into classes.

| Token | Use | Rule |
|---|---|---|
| `--mm-yellow-500` | Main call to action, active navigation, ratings | Never use it as text on white or canvas (1.7:1), and never put white text on it. Put charcoal text on it (8.4:1). |
| `--mm-charcoal-900` | Headings, dark header/sidebar/hero, primary text | White text on it (14.5:1). |
| `--mm-canvas` | Page background | Keep cards white for a clear hierarchy. |
| Semantic | Status only | Pair every status colour with text or an icon, never colour alone. Keep brand yellow distinct from warnings. |

**Composition guide:** mostly white and canvas, charcoal for structure, and a little yellow. Yellow marks the one thing to do next.

## 2. Typography

| Style | Font | Weight | Desktop size / line height | Use |
|---|---|---|---|---|
| Display | Manrope | 800 | 48 / 56 | Hero title only |
| H1 | Manrope | 800 | 40 / 48 | Main page title |
| H2 | Manrope | 700 | 32 / 40 | Section title |
| H3 | Manrope | 700 | 24 / 32 | Card/feature title |
| Title | Manrope | 700 | 20 / 28 | Dialogs, key cards |
| Body | Inter | 400 | 16 / 24 | Default content |
| Body small | Inter | 400 | 14 / 20 | Supporting text |
| Label | Inter | 600 | 14 / 20 | Inputs, chips, buttons |
| Caption | Inter | 500 | 12 / 16 | Metadata only |

- On mobile (<768px), Display is 36/44, H1 32/40 and H2 28/36.
- Use Manrope only for headings and Inter for all UI and body text. In Office documents without these fonts, fall back to Arial.
- Left-align working content and centre only short hero or cover titles. No all-caps paragraphs.
- Put units next to values (`25 m²`, `12 mm`, `TZS 150,000`) and write dates as `06 Sep 2026`.

## 3. Layout

- **Breakpoints:** mobile 0–767, tablet 768–1023, desktop 1024–1439, wide 1440+. Build mobile-first and collapse to a single column below 768px.
- **Desktop:** fixed charcoal sidebar 240px wide. Content max width 1440px, page padding 32px, card gap 24px, card padding 24px (16px for compact cards).
- **Dashboard hero:** a charcoal panel with white text and one yellow primary action.
- **Mobile:** 16px gutter minimum and touch targets of at least 44×44px. Use a fixed bottom nav only in the main customer app, never in dense expert/admin workflows.
- **Mobile customer home:** charcoal header with the logo, "Hello, {name}", "What do you need fixed?" and a search field. Below it: a service carousel, "Top rated near you" expert card, a full-width yellow "Book an expert" button, a promo card ("Reliable professionals for a better tomorrow.") and the bottom nav (Home, Explore, Projects, Profile).
- **Desktop dashboard:** sidebar (Home, Find Experts, My Projects, Messages [count badge], Saved, Payments, Settings, footer "Let's build together"). Top bar with location picker, search, notifications and user menu. Then the hero "Find a skilled expert" / "Get trusted help for your next project.", Popular services, Featured experts and Your project.

## 4. Components

Keep APIs small and predictable. Every component defines these states: default, hover, focus-visible, disabled, loading, error, empty, success.

### Button: `Button({ variant: 'primary'|'secondary'|'tertiary'|'destructive', size: 'sm'|'md'|'lg', icon?, iconRight?, loading?, block?, href? })`

| Variant | Background | Text | Use |
|---|---|---|---|
| Primary | `--mm-yellow-500` (hover `-600`) | `--mm-charcoal-900` | One main action per section |
| Secondary | white + 1px charcoal border | charcoal | Alternative action ("Find expert", "View profile") |
| Tertiary | transparent | charcoal | Low emphasis ("See all") |
| Destructive | `--mm-error` | white | Confirmed irreversible actions |

```css
.mm-button { min-height: 44px; padding: 0 20px; border-radius: var(--mm-radius-md);
  font: 600 14px/20px var(--mm-font-body);
  transition: background-color 160ms ease, box-shadow 160ms ease, transform 160ms ease; }
.mm-button--primary { background: var(--mm-yellow-500); color: var(--mm-charcoal-900); }
.mm-button--primary:hover { background: var(--mm-yellow-600); }
.mm-button:focus-visible { outline: none; box-shadow: var(--mm-focus-ring); }
.mm-button:active { transform: translateY(1px); }
```

- `loading` replaces the leading icon with a spinner and sets `aria-busy`.
- Disabled buttons use opacity .45 and `cursor: not-allowed`.
- Labels are a specific verb plus an object ("Book an expert"), not "Continue" or "OK".

### TextField

- 48px tall, 12px radius, white surface and a 1px `--mm-border` border. Optional leading icon (search) or trailing icon (location pin) in `--mm-text-muted`.
- The label is always visible above the input (Label style, 8px gap). A placeholder is an example, never the only label. A visually hidden label is allowed only for an obvious search box.
- Focus: `--mm-focus` border plus `--mm-focus-ring`.
- Error: `--mm-error` border, an alert icon and plain-language text under the field, with `aria-invalid`, `aria-describedby` and `role="alert"`.

### Cards

- Base: `--mm-surface`, `1px solid var(--mm-border)`, 12px radius. Use `--mm-shadow-card` only for featured, interactive or elevated cards; otherwise prefer borders.
- **ServiceCard:** a simple line/icon illustration, title and chevron, with one clear next action. The whole card is a link or button. Tints: electrical `--mm-warning-bg` with a yellow icon disc, plumbing `--mm-info-bg`, building `--mm-success-bg`, finishing `--mm-canvas`. Hover shows `--mm-shadow-card`.
- **ExpertCard:** always shows avatar, name, trade, rating, location, availability chip and a secondary "View profile" button. Never convey trust through a star rating alone.
- **Metric card** (project and admin views): a quiet 14px label above a large bold value.

### StatusChip and Rating

- Chip: pill radius, `-bg` tint, a 10px dot in the semantic colour, and the label in `--mm-text` (the semantic colours fail 4.5:1 as small text on their tints).
- Labels: `Available today`, `In progress`, `Awaiting quote`, `Completed`, `Offline`.
- Rating: yellow star plus the number, e.g. `aria-label="Rated 4.9 out of 5"`. The badge variant sits on `--mm-warning-bg`.

### Navigation

- **Sidebar:** `--mm-charcoal-900`, 240px wide. Inactive items are white at 80–90% opacity. The active item has a `--mm-charcoal-800` background, a yellow icon and `aria-current="page"`. Count badges are yellow pills with charcoal numbers.
- **Bottom nav:** white with a top border. The active item has a filled yellow icon and a bold label.
- Keep labels and icon positions stable and labels short: Home, Explore, Projects, Messages, Profile.

### Hero panel

Charcoal panel with 16px radius and 48px padding (24px on mobile). Display title in white, one subtitle line, then a search field plus one yellow primary button. Trust row: "Trusted professionals · Quality work · Stronger communities", each with a line icon.

## 5. Iconography and illustration

- Icons: rounded line icons, 2px stroke, 24px grid, `currentColor` (Lucide matches well). Use filled icons only for selected states. The brand mark is not an icon for features.
- Category motifs: bolt = electrical, tap = plumbing, bricks = building, paint roller = finishing.
- Illustrations: simple and friendly, with charcoal outlines and yellow accents (workers in yellow hard hats, scaffolds, light bulbs, taps). Avoid technical blueprints, hazard imagery and generic stock photos. Decorative drawings must never look like approved construction details.
- Icon-only controls need an `aria-label`. Decorative icons get `aria-hidden`.

## 6. Motion

Use 160ms by default and 200ms for menus and dialogs. Ease-out on entrance, ease-in on exit, and keep movement under 8px. Respect `prefers-reduced-motion`. Never animate a status into a different meaning without explicit confirmation.

## 7. Logo

The mark combines the **hard hat** (site work, responsibility), the **gear** (coordination) and the **checkmark** (follow-through). The wordmark reads MHANDISI MAKINI with "Let's build together" beneath it. Approved files:

- `mhandisi-makini-horizontal-light.png` / `mhandisi-makini-stacked-light.png`: charcoal + yellow, for light backgrounds.
- `mhandisi-makini-horizontal-dark.png` / `mhandisi-makini-stacked-dark.png`: white + yellow on charcoal, for the sidebar, dark headers and hero.

Rules:

- Reference the supplied asset. Never redraw, retype or rebuild the mark in CSS, SVG or generated artwork, and never recolour, stretch, rotate, shadow or add effects.
- Never move the checkmark or separate the hat from the gear, and never put a slogan inside the mark.
- If the project has no logo file, use a placeholder `<img>` pointing at the expected path and tell the user which file to add.
- Use the dark logo on light backgrounds and the white/yellow version on charcoal.
- Clear space equals the height of the helmet brim. Never place the logo on busy imagery (put it on a plain panel), and never use yellow text on white.
- Test the logo at its final size. Small uses (app icon, decals, embroidery) need a dedicated symbol-only master: don't squeeze the full name into a tiny square, and say so rather than improvising one.
- The files are raster PNGs, not production vector masters. Flag this when print or large-format work needs vectors.
- Never use the checkmark to imply that an inspection, certification or technical approval happened.

## 8. Voice and copy

- **Direct and human:** "Find a skilled expert", not "Initiate service provider discovery". Address the user as "you" and greet by first name. Start with what happened or what the user needs to do.
- Use sentence case for all interface labels ("Book an expert", never "BOOK AN EXPERT").
- No emoji in UI copy, no blame and no manufactured urgency. Never stack competing calls to action.
- No unsupported promises ("guaranteed", "zero delays", "best experts ever"). Never imply endorsement or certification you can't back up.
- **Empty states** are friendly and specific: "No experts found in this area yet. Try another location."
- **Honesty rules:**
  - Never say "Booked", "Saved" or "Sent" before the server confirms it, and distinguish local saving from syncing.
  - Don't guess an error's cause. A confirmed connection failure: "Booking not sent. Check your connection and try again." Unknown: "Booking not sent. Try again."
  - Never show a raw error code as the only explanation.
- **Naming:** Mhandisi Makini in prose, MHANDISI MAKINI in formal references and inside the logo artwork. The name is the same in English and Swahili.
- Let text wrap in English **and Swahili** (Swahili runs longer). Never truncate an essential instruction; adjust the layout instead.
- Match the interface language throughout each screen, and have Swahili reviewed by users before release.

| Moment | English | Swahili |
|---|---|---|
| Primary action | Book an expert | Weka nafasi ya fundi |
| Search prompt | What do you need fixed? | Unahitaji kutengenezewa nini? |
| Availability | Available today | Anapatikana leo |
| Confirmed booking | Booking confirmed. | Nafasi imethibitishwa. |
| Confirmed save | Saved. | Imehifadhiwa. |
| Required field | Enter your location. | Weka eneo lako. |
| Empty state | No experts found in this area yet. Try another location. | Hakuna mafundi eneo hili bado. Jaribu eneo lingine. |
| Failed request | Booking not sent. Try again. | Ombi halijatumwa. Jaribu tena. |

## 9. Applications beyond the app

- **Sign-in / launch:** a white or canvas screen with the stacked light logo and generous clear space. On sign-in the logo is secondary to the form. Prefer an instruction over a slogan.
- **Reports and documents:**
  - Logo top-left, then title, project name, date, author and revision.
  - Charcoal Manrope headings, Inter body, white pages and small yellow accents.
  - Long reports get page numbers and a project ID, and status and approval fields are explicit.
- **Social (1080 × 1080):** keep important text within a 64px inset. One headline, one visual, one call to action, and only for things that exist.
- **Signage and workwear:** full logo on a plain panel. Proof simplified masters at actual size, and keep branding away from required safety markings.
- **Partner branding:** each logo gets its own clear space. Describe relationships accurately.

## 10. Accessibility (WCAG 2.2 AA)

- 4.5:1 for normal text; 3:1 for large text, UI boundaries, focus rings and meaningful icons.
- **Known misses in the palette, to work around rather than re-tint:**
  - `--mm-text-subtle` on white is 3.8:1: use it only for large text or decoration.
  - Success, warning and error as small text on their tints are 3.8–4.1:1: put the label in `--mm-text`.
  - White on `--mm-error` is 4.4:1: keep destructive labels short and bold.
  - `--mm-border` is 1.3:1: inputs always get a visible label and a strong focus state.
- Show a visible `:focus-visible` style on every interactive element, and never remove an outline without replacing it.
- Use semantic HTML: `button` for actions, `a` for navigation, labels tied to inputs, native heading order. Announce validation and status updates (`role="status"` / `aria-live`).
- Mark the active nav item with more than colour: a background or indicator plus bold weight.

## 11. Do / Don't

| Do | Don't |
|---|---|
| Charcoal text on yellow buttons | White text on yellow, or yellow text on white |
| One yellow primary action per section | Two competing yellow actions |
| `--mm-*` variables | New hex values in component files |
| Manrope headings, Inter UI text | Other fonts, or Manrope for body copy |
| Labels above fields | Placeholders standing in for labels |
| Status dot + word | A coloured dot alone |
| Rating beside trade, location and availability | Trust shown by stars alone |
| "Booking not sent. Try again." | "Error 1042" |
| The supplied logo file | A redrawn or CSS-built logo |
| Friendly worker/scaffold illustrations | Hazard imagery, blueprints, stock photos |

## 12. Rules when generating code

1. Use the `--mm-*` variables. Never hardcode new hex colours in component files.
2. Manrope for headings, Inter for everything else.
3. White cards on `--mm-canvas`. Reserve charcoal for navigation, hero panels and high-trust emphasis.
4. Yellow is for the primary action only (plus active nav and stars), never a decorative fill.
5. Defaults: 12px radius, 16px mobile padding, 24px desktop card padding, 24px gaps.
6. Mobile-first. Collapse multi-column layouts below 768px.
7. Make every state explicit: default, hover, focus-visible, disabled, loading, error, empty, success.
8. Reference the approved logo asset. Never recreate it.

## 13. Review before shipping

- Exact brand spelling, with the right logo variant and clear space for the background.
- Correct token values, with no stray hex values or fonts.
- One primary action per section.
- Labels on every input, and every status shows a word next to its colour.
- 44px touch targets and a visible focus state.
- Contrast checked, including on the charcoal surfaces.
- Sentence case, correct dates and units, and honest copy that matches what the product actually does.
- Image permissions obtained.
- Layout checked at 375px and 1440px, and on a real phone in bright light: experts use it on site.

One brand owner approves new logo masters, palette changes, taglines and templates. Record the version, date and reason for each revision.

When a request conflicts with this system, say so and offer the compliant alternative rather than silently breaking the brand.