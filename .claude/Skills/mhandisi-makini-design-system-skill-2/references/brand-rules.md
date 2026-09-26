# Brand rules — voice, copy, logo, accessibility

## Voice
- Brand promise: trusted construction help, made approachable. Personality: capable, welcoming, practical, optimistic — a professional site supervisor who is easy to talk to.
- Direct and human: "Find a skilled expert", not "Initiate service provider discovery". Speak to "you"; greet by first name on home screens.
- Sentence case for every UI label; no all-caps (only the logo artwork is uppercase). No emoji in UI.
- No unsupported promises ("guaranteed", "zero delays", "best experts ever"); never imply certification or endorsement you can't back up.
- Honesty: never say "Booked", "Saved", "Sent" before the server confirms. Don't guess error causes — confirmed network failure: "Booking not sent. Check your connection and try again."; unknown: "Booking not sent. Try again." Never a raw error code alone.
- Units and dates: `25 m²`, `12 mm`, `TZS 150,000`, `06 Sep 2026`.
- Naming: "Mhandisi Makini" in UI and prose; the name is the same in English and Swahili. Tagline "Let's build together" — exact wording, sentence case, keep in English.

## Bilingual copy
| Moment | English | Swahili |
|---|---|---|
| Primary action | Book an expert | Weka nafasi ya fundi |
| Search prompt | What do you need fixed? | Unahitaji kutengenezewa nini? |
| Availability | Available today | Anapatikana leo |
| In progress | In progress | Inaendelea |
| Awaiting quote | Awaiting quote | Inasubiri bei |
| Completed | Completed | Imekamilika |
| Confirmed booking | Booking confirmed. | Nafasi imethibitishwa. |
| Required field | Enter your location. | Weka eneo lako. |
| Empty state | No experts found in this area yet. Try another location. | Hakuna mafundi eneo hili bado. Jaribu eneo lingine. |
| Failed request | Booking not sent. Try again. | Ombi halijatumwa. Jaribu tena. |
Match one language per screen; let Swahili wrap (it runs longer); never truncate an essential instruction. Swahili strings are drafts — flag them for native review before release. Put strings in the project's i18n files if it has them.

## Logo
Files (copied by `install.mjs`, default `public/brand/`):
- `mhandisi-makini-horizontal-light.png`, `mhandisi-makini-stacked-light.png` — on white/canvas.
- `mhandisi-makini-horizontal-dark.png`, `mhandisi-makini-stacked-dark.png` — on charcoal (sidebar, dark header, hero).
Rules: always `<img>` with `alt="Mhandisi Makini"` (or `alt=""` if the name is also in adjacent text). Never redraw in SVG/CSS, retype the wordmark, recolour, stretch, rotate, shadow, or place on busy imagery. Clear space = helmet-brim height. Small sizes (favicons, app icon) need a dedicated symbol-only master — say so rather than cropping or improvising. Never use the checkmark to imply an inspection or certification happened.

## Accessibility (WCAG 2.2 AA)
- Text 4.5:1; large text, UI boundaries, focus rings, meaningful icons 3:1.
- Verified pairs: charcoal on yellow 8.4:1 · white on charcoal 14.5:1 · text on white 14.5:1 · muted on white 5.7:1 · info on white 5.2:1.
- Known limits (keep values, work around): `--mm-text-subtle` 3.8:1 → large text only · success/warning/error as small text on their tints 3.8–4.1:1 → labels in `--mm-text` · white on `--mm-error` 4.4:1 → short bold labels · `--mm-border` 1.3:1 → always a visible label + strong focus · yellow on white 1.7:1 → never.
- `:focus-visible` on every interactive element (`--mm-focus-ring`); never remove outlines without a replacement.
- Semantic HTML: `button` actions, `a` navigation, `label for`, one `h1`, ordered headings. `aria-live`/`role="status"` for async updates; `role="alert"` for field errors.
- Motion: 160ms (hover/press/focus), 200ms (menus/dialogs), ease-out in, ease-in out, <8px movement; honour `prefers-reduced-motion`.
