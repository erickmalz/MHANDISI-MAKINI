---
name: mhandisi-makini-design-system-skill-2
description: Build Mhandisi Makini UI in code — installs the brand's tokens.css, components.css, typed React components, Tailwind preset and logo files into a project, then gives component markup, page recipes and a brand lint script. Use whenever writing or reviewing Mhandisi Makini screens, components or styles (React, Next.js, Vite, Tailwind, HTML, Vue).
---

# Mhandisi Makini Design System — Skill 2 (Claude Code kit)

Helmet yellow `#FFB800` on charcoal `#252A2D`, Manrope headings, Inter body, 12px corners, 8px spacing rhythm, tagline "Let's build together". Brand promise: trusted construction help, made approachable.

Kit layout (paths relative to this SKILL.md):
- `assets/styles/tokens.css` — all `--mm-*` variables, fonts, type classes. `assets/styles/components.css` — every `mm-` component.
- `assets/react/mhandisi-makini.tsx` — typed, dependency-free React 18+ components (Button, TextField, StatusChip, Rating, ServiceCard, ExpertCard, HeroPanel, SidebarNav, BottomNav, Icon).
- `assets/tailwind/` — v3 preset (`.cjs`) and v4 `@theme` file.
- `assets/brand/` — the four approved logo PNGs.
- `scripts/install.mjs` — copies the kit into a project. `scripts/check-brand.mjs` — brand lint.
- `references/components.md` — props + HTML markup for every component, and how to extend.
- `references/pages.md` — app shell, dashboard, mobile home, profile, booking flow, states.
- `references/brand-rules.md` — voice, EN/SW copy, logo rules, accessibility and contrast limits.

## Workflow

1. **Detect.** Grep the project for `--mm-yellow-500`. If found, the kit is installed — reuse those files, don't copy again. Note the stack (package.json: react/next/vite/vue, tailwind version, TypeScript).
2. **Install (if missing).** Run:
   ```bash
   node "<this skill dir>/scripts/install.mjs" --project . [--tailwind v3|v4] [--no-react]
   ```
   It auto-picks `src/styles/mhandisi-makini/`, `src/components/mhandisi-makini/index.tsx`, `public/brand/` (override with `--styles/--react/--brand`), never overwrites without `--force`, and prints what it wrote. Use `--no-react` for non-React stacks. Then import `tokens.css` then `components.css` once at the app root (e.g. `main.tsx`, `app/layout.tsx`, `index.html`). For Tailwind v3 add `presets: [require('./mhandisi-makini.preset.cjs')]`; for v4 import the copied `tailwind-theme.css` after `tokens.css`.
3. **Build.** Compose screens from the kit components (read `references/components.md` for props/markup, `references/pages.md` for layouts). Only write new CSS for things the kit doesn't cover, using `--mm-*` variables.
4. **Check.** Run `node "<this skill dir>/scripts/check-brand.mjs" src` and fix every issue (off-palette hex, hardcoded hex, foreign fonts, all-caps UI text, unlabeled inputs, removed outlines). Then verify the checklist below and tell the user which files you created or changed.

## Non-negotiable rules
1. Colours, spacing, radii, shadows only via `--mm-*` variables (or the Tailwind `mm-*` utilities). No new hex values, no other fonts.
2. Manrope for headings (`mm-display`, `mm-h1`…`mm-title`), Inter for all UI/body text. Sentence case everywhere ("Book an expert").
3. White cards (`--mm-surface`) on `--mm-canvas`. Charcoal only for navigation, hero panels, high-trust emphasis — with white text.
4. Yellow = the ONE primary action per section, the active nav indicator, rating stars. Never decoration, never text on white, never white text on yellow.
5. Status = colour + word (+ dot/icon). A rating always sits with trade, location and availability.
6. Mobile-first; one column <768px; 16px gutters; touch targets ≥44px; BottomNav only in the customer app.
7. Visible `:focus-visible` on every control; labels on every input; `prefers-reduced-motion` respected.
8. Logo: use the PNGs in `public/brand/` via `<img>` — light files on light surfaces, dark files on charcoal. Never redraw, retype, recolour or stretch it. If a variant you need (favicon, app icon, vector) doesn't exist, say so instead of improvising.
9. Copy: direct and human, no emoji, no unsupported promises, never claim "Booked/Sent/Saved" before the server confirms. Swahili strings: see `references/brand-rules.md`, flag them for native review.

## Token cheat sheet
| Need | Use |
|---|---|
| Page bg / card bg / border | `--mm-canvas` / `--mm-surface` / `--mm-border` |
| Text / supporting / large-only | `--mm-text` / `--mm-text-muted` / `--mm-text-subtle` |
| Primary action / hover | `--mm-yellow-500` / `--mm-yellow-600` (text `--mm-charcoal-900`) |
| Dark surfaces / raised dark | `--mm-charcoal-900` / `--mm-charcoal-800` |
| Status | `--mm-success|info|warning|error` + `-bg` tints |
| Focus | `--mm-focus` border + `--mm-focus-ring` shadow |
| Spacing | `--mm-space-1..16` (4, 8, 12, 16, 20, 24, 32, 40, 48, 64px) |
| Radius | `--mm-radius-sm` 8 · `-md` 12 (default) · `-lg` 16 (hero) · `-pill` |
| Shadow | `--mm-shadow-card` (featured cards only) · `--mm-shadow-float` (overlays) |
| Layout | sidebar 240px · content max 1440px · card padding 24px (16px mobile/compact) · gaps 24px |
| Breakpoints | 768 tablet · 1024 desktop · 1440 wide |
| Motion | 160ms default · 200ms overlays · ease-out in / ease-in out |

## Done checklist
- [ ] `check-brand.mjs` passes (or remaining findings explained)
- [ ] One yellow primary per section; all states (hover, focus, disabled, loading, empty, error, success) defined
- [ ] Every input labelled; every status worded; icon-only buttons have `aria-label`
- [ ] Correct logo variant for its background, with clear space
- [ ] Layout checked at 375px and 1440px
- [ ] User told which files were created/changed and anything left to supply (logo variants, Swahili review)
