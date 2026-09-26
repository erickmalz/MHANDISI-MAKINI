# TextField
A labelled single-line input with optional leading/trailing icon, hint and error.

**Consumer provides:** `label` (always; use `hideLabel` only for a search box whose purpose is obvious from its icon and placeholder), `placeholder` (an example, never the label), `icon` / `trailingIcon`, `hint`, `error`, and any native input props (`value`, `onChange`, `type`, `name`).

- 48px tall (`mm-input-height`), `mm-radius-md`, white `mm-surface`, 1px `mm-border`.
- Focus: `mm-focus` border plus `mm-focus-ring`.
- Error: `mm-error` border, an alert icon and plain-language text under the field; wired with `aria-invalid`, `aria-describedby` and `role="alert"`.
- The label sits above the input in `label` style with `mm-space-2` gap.
