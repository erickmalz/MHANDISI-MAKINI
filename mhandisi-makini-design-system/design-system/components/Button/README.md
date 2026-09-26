# Button
Triggers an action; one yellow Primary per section.

**Consumer provides:** `children` (sentence-case label), `variant`, optional `size`, `icon` / `iconRight`, `loading`, `disabled`, `href` (renders a link styled as a button), `block` for full width.

| Variant | Look | Use |
|---|---|---|
| `primary` | `mm-yellow-500` fill, charcoal label; hover `mm-yellow-600` | The one main action per section: “Book an expert”, “Book service”. |
| `secondary` | white, 1px charcoal border | Alternative action: “Find expert”, “View profile”. |
| `tertiary` | transparent | Low emphasis: “See all”, “Skip”. |
| `destructive` | `mm-error` fill, white label | Confirmed, irreversible actions only. White on `mm-error` is 4.4:1 — keep labels short and bold. |

- Height ≥ 44px at every size; radius `mm-radius-md`; label style `label`.
- Focus-visible shows `mm-focus-ring`; pressed nudges 1px down; `loading` swaps the leading icon for a spinner and sets `aria-busy`.
- Don’t put two Primary buttons side by side; don’t use yellow buttons as decoration.
- Icon-only buttons need an `aria-label`.
