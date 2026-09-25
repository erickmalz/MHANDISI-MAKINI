# Component specifications

MHANDISI MAKINI v1.1. Values come from `tokens.css` — never retype hexes.

The governing idea: **make the next action clear.** Readable information,
predictable controls, honest feedback.

---

## Buttons

| | Primary | Secondary |
|---|---|---|
| Fill | helmet yellow `#FFB800` | White |
| Label | Charcoal, Bold, 16 px | Charcoal, Bold, 16 px |
| Border | none | 1 px Charcoal |
| Radius | 8 px | 8 px |
| Padding | 12 px × 24 px | 12 px × 24 px |
| Min height | 48 px | 48 px |

- **One dominant action per view.** If a screen offers "Continue" and "Submit"
  as two equal yellow buttons, the engineer has to guess — that is the failure
  case the guidelines call out by name.
- Labels are a specific verb + object: **"Submit report"**, **"Create daily
  report"** — not "Continue", "OK", "Go".
- Sentence case. Never uppercase button labels.
- Disabled state must still be distinguishable by more than colour; prefer
  keeping the button enabled and explaining what is missing.

```html
<button class="mm-btn-primary">Create daily report</button>
<button class="mm-btn-secondary">Save draft</button>
```

---

## Cards

White surface, 1 px subtle border, 8 px radius, 16 px internal padding.
Group related information inside one card; separate cards by 24 px.

A metric card reads: quiet label (14 px), then the value (large, bold).
The label describes what is counted, the value carries the weight.

```html
<div class="mm-card">
  <p class="mm-label">Tasks complete</p>
  <p style="font-size:1.75rem;font-weight:700;margin:0">18 / 24</p>
</div>
```

---

## Inputs

Structure, top to bottom: **label → field → helper text → error message.**

- The label is **persistent and visible**. A placeholder is never the label —
  it disappears the moment the engineer starts typing.
- Visible border at rest, not just on focus.
- Required fields are marked in the label, not discovered on submit.
- Errors appear **near the relevant field** and say how to recover.
- Minimum 48 px height.

```html
<div class="mm-field" data-invalid="true">
  <label for="project">Project name</label>
  <input id="project" aria-describedby="project-error" />
  <p class="mm-error" id="project-error">Enter the project name.</p>
</div>
```

---

## Status

Colour never travels alone. Every status is `colour + word`, optionally an icon.

| Meaning | Colour | Example label (EN) | Example label (SW) |
|---|---|---|---|
| Success | `#168A56` | Complete | Imekamilika |
| Warning | `#A96800` | Action needed | Hatua inahitajika |
| Error | `#D64545` | Overdue | Imechelewa |
| Info | `#2667D9` | In progress | Inaendelea |

Keep brand yellow **distinct from warning messages** — yellow means "this is the
primary action", not "caution". If something needs attention, use the warning
colour and an explicit label such as "Action needed" or "Overdue".

```html
<span class="mm-status mm-status--error">Overdue</span>
```

---

## Navigation

- Stable labels and stable icon positions between screens.
- The active section is marked by **more than colour** — bold weight plus an
  indicator bar (`box-shadow: inset 0 -3px 0 var(--mm-yellow)`) or underline.
- Label unfamiliar icons.

---

## Interaction and accessibility

- **48 × 48 px** minimum target for anything tappable.
- Visible keyboard focus on every interactive element — 2 px `#2667D9` outline
  with 2 px offset. Never `outline: none` without a replacement.
- Support text resizing; layouts must reflow rather than clip.
- Screen-reader labels on icon-only controls.
- Test contrast, focus and touch interaction on a real device in bright
  outdoor conditions — this app is used on site.

---

## Empty, loading and error states

Plain language, and always a recovery action.

| State | Copy pattern |
|---|---|
| Empty | What is missing + how to add the first one. "No tasks yet. Add your first task." |
| Loading | Say what is loading, not just a spinner. |
| Saved | Only after confirmation. If local save and sync are separate, say which happened. |
| Failed | What failed + what to do. "Report not submitted. Try again." |

Never show a success message before the action is confirmed.

---

## Icons

- 24 px grid, ~2 px stroke, outline style.
- Consistent stroke weight, corner treatment and optical size across the set.
- Familiar symbols for reports, tasks, people, project information.
- The brand mark is **not** the icon for every feature.

---

## Dashboard layout pattern

The reference screen from the guidelines:

1. Charcoal header bar with `MHANDISI MAKINI` in white.
2. Concrete page background.
3. Page title, sentence case, 28 px bold: "Project overview".
4. A row of white metric cards — quiet label above a large bold value.
5. One yellow primary action beneath: "Create daily report".

That is the whole hierarchy: brand → purpose → essential information → next
action. Every screen repeats it.
