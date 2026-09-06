# MHANDISI MAKINI Design System — Claude Code skill

Encodes Brand Guidelines v1.1 (September 2026) so Claude applies the identity
consistently across code, documents and marketing assets.

## Install

**Per project** — copy the folder into the repo:

```
your-project/
└── .claude/
    └── skills/
        └── mhandisi-makini-design-system/
            ├── SKILL.md
            ├── references/
            └── assets/
```

Commit it so the whole team gets the same brand source.

**All projects** — copy it to `~/.claude/skills/` instead.

Verify with `/skills` in Claude Code, or just ask *"style this using the
Mhandisi Makini design system"*.

## Contents

| File | Purpose |
|---|---|
| `SKILL.md` | The system: colour, type, layout, components, voice, logo, applications |
| `references/tokens.css` | CSS custom properties + base component classes |
| `references/tailwind-preset.js` | Tailwind theme preset |
| `references/components.md` | Component specs and patterns |
| `references/voice-and-copy.md` | Tone, EN/SW string table, honesty rules |
| `references/review-checklist.md` | Pre-release check |
| `assets/` | Logo concepts + the source guidelines PDF |

## Wire up the tokens

CSS:

```html
<link rel="stylesheet" href="/.claude/skills/mhandisi-makini-design-system/references/tokens.css">
```

Better: copy `tokens.css` into your real stylesheet directory and import it —
skills folders shouldn't be served in production.

Tailwind:

```js
module.exports = {
  presets: [require('./.claude/skills/mhandisi-makini-design-system/references/tailwind-preset.js')],
  content: ['./src/**/*.{js,ts,jsx,tsx,html}'],
};
```

## Notes

The logo in `assets/` is a **raster concept**, not a production vector master.
Horizontal, reversed, mono and app-tile variants are still deliverables — the
skill tells Claude to flag this rather than improvise a variant.

Open items from v1.1: confirm the typeface, appoint a brand owner, complete the
production logo masters, validate bilingual copy with site engineers.
