Trusted construction help, made approachable. Mhandisi Makini connects people with skilled professionals — electricians, plumbers, builders, finishers — for safer, smarter, stronger communities. **Tagline: “Let’s build together.”**

The system should feel like a professional site supervisor who is easy to talk to: capable, welcoming, practical and optimistic. Deep charcoal gives structure and trust; helmet yellow marks action and energy; light neutral surfaces keep everything readable.

## Content fundamentals

- **Direct and human.** Say what the person gets: “Find a skilled expert”, not “Initiate service provider discovery”. “What do you need fixed?”, “Get trusted help for your next project.”
- **Sentence case everywhere** in the interface: “Book an expert”, “View profile”, “See all” — never “BOOK AN EXPERT”.
- **Address the user as “you”**, greet by first name on home screens (“Hello, Amina”).
- **Short navigation labels:** Home, Explore, Projects, Messages, Profile (desktop adds Find Experts, My Projects, Saved, Payments, Settings).
- **Status vocabulary:** `Available today`, `In progress`, `Awaiting quote`, `Completed`, `Offline`.
- **Empty states are friendly and specific:** “No experts found in this area yet. Try another location.”
- **Errors are plain language** and say how to fix it: “Enter a location so we can find experts near you.”
- No emoji in UI copy. Trust lines are short noun phrases: “Trusted professionals · Quality work · Stronger communities”.

## Visual foundations

**Colour.** Favour white cards (`mm-surface`) on the canvas (`mm-canvas`). Reserve `mm-charcoal-900` for navigation, hero panels and high-trust emphasis, with white text. Use `mm-yellow-500` for the ONE primary action per section, the active nav indicator and rating stars — not as a decorative fill. Never set yellow text on white or canvas (1.7:1). Semantic colours (`mm-success`, `mm-info`, `mm-warning`, `mm-error` and their `-bg` tints) are for status only, always paired with a word or icon.

**Type.** `Manrope` for headings (styles `display`, `h1`, `h2`, `h3`, `title`), `Inter` for all UI and body text (`body`, `body-small`, `label`, `caption`). Below 768px swap in `display-mobile`, `h1-mobile`, `h2-mobile`. Both are Google Fonts: load `https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Manrope:wght@600;700;800&display=swap` (the component stylesheet imports it). Primary text is `mm-text`; supporting text `mm-text-muted`; `mm-text-subtle` only for large text or non-text marks.

**Spacing.** An 8px rhythm: `mm-space-2` … `mm-space-16`. `mm-space-1` (4px) only for tight icon/text alignment. Card padding `mm-space-6` on desktop, `mm-space-4` compact and on mobile; grid gaps `mm-space-6`; page padding `mm-space-8` desktop, `mm-space-4` gutter on mobile.

**Shape.** Default radius `mm-radius-md` (12px) for buttons, inputs and cards; `mm-radius-lg` for hero panels; `mm-radius-pill` for chips and filters. Don’t mix sharp and very round components in one area.

**Borders and shadows.** Group with a 1px `mm-border` first. `mm-shadow-card` only for featured, interactive or elevated cards; `mm-shadow-float` for menus, popovers and dialogs.

**Layout.** Desktop: fixed charcoal sidebar `mm-sidebar-width` (240px), content up to `mm-content-max` (1440px). Dashboard hero = charcoal panel, white headline, yellow primary action. Mobile-first: one column under `mm-bp-tablet` (768px); touch targets ≥ `mm-touch-target` (44px). Fixed bottom navigation only in the main customer app — never in dense expert/admin workflows. Breakpoints: mobile 0–767, tablet 768–1023, desktop 1024–1439, wide 1440+.

**States.** Every component defines default, hover, focus-visible, disabled, loading, error, empty and success. Primary hover = `mm-yellow-600`. Focus-visible = `mm-focus-ring` (inputs add a `mm-focus` border). Press = 1px downward nudge.

**Motion.** `mm-duration-fast` (160ms) for hover/press/focus, `mm-duration-overlay` (200ms) for menus and dialogs. Ease-out in, ease-in out, movement under 8px. Respect `prefers-reduced-motion`. Never animate a status into a different meaning without explicit confirmation.

**Imagery.** Simple, friendly illustrations with charcoal outlines and yellow accents — workers in hard hats, scaffolds, a light bulb, a tap. Avoid technical blueprints, hazard imagery and generic stock-photo looks. Service cards sit on soft tints (warm yellow for electrical, `mm-info-bg` for plumbing, `mm-success-bg` for building).

## Logo

Use the supplied files in the **Logos** group — never redraw, recolour, stretch or add effects, and never rebuild the mark in CSS/SVG.

- `mhandisi-makini-horizontal-light.png` / `mhandisi-makini-stacked-light.png` — charcoal mark on light backgrounds.
- `mhandisi-makini-horizontal-dark.png` / `mhandisi-makini-stacked-dark.png` — white/yellow mark on charcoal (sidebar, dark headers, hero).
- Clear space around the mark = the height of the helmet brim. Never place it on busy imagery.

## Iconography

Rounded line icons with a 2px stroke, `currentColor`; filled only for selected states (e.g. the active bottom-nav item). Category motifs: bolt = electrical, tap = plumbing, bricks = building, paint roller = finishing. No icon files were supplied with the brand — the components draw a small built-in set (search, pin, arrow, star, bolt, tap, bricks, roller, home, briefcase, chat, heart, card, gear, user, bell, calendar, shield). For more, use a matching rounded 2px line set such as Lucide.

## Accessibility

- WCAG 2.2 AA: 4.5:1 for normal text, 3:1 for large text and UI boundaries.
- Known misses kept exact from the source (see each token’s note): `mm-text-subtle` on white 3.8:1; `mm-success`/`mm-warning`/`mm-error` as small text on their `-bg` tints (3.8–4.1:1); white on `mm-error` 4.4:1; `mm-border` 1.3:1. Status chips therefore render their label in `mm-text` beside a coloured dot.
- Every icon-only control has an `aria-label`; labels are always visible above inputs (placeholder is an example, never the label).
- Semantic HTML: `button` for actions, `a` for navigation, labels tied to inputs, native heading order. Announce validation and status updates (`role="status"` / `aria-live`).

## Implementation rules

1. Use the CSS variables (`--mm-…`); never hardcode new hex values in components.
2. Component API stays small: `Button({ variant: 'primary' | 'secondary' | 'tertiary' | 'destructive', size: 'sm' | 'md' | 'lg' })`.
3. Every service card has an icon/illustration, a title and one clear next action. Expert cards show avatar, name, trade, rating, location and availability — never trust through a star rating alone.

Reference screens (Screens group): `design-system-sheet.png`, `desktop-dashboard.png`, `mobile-home.png`.
