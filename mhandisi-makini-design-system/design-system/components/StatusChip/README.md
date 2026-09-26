# StatusChip
A pill that pairs a coloured dot with a word — never colour alone.

**Consumer provides:** `status` (`available`, `progress`, `awaiting`, `completed`, `error`, `offline`, `info`) which sets tone and default label; optional `children` to override the label, `tone` to override the colour, `live` to announce changes (`role="status"`).

- Pill radius (`mm-radius-pill`), `-bg` tint of its semantic colour, dot in the full semantic colour.
- The label is set in `mm-text`, not the semantic colour: `mm-success`, `mm-warning` and `mm-error` fall below 4.5:1 as small text on their tints.
- Recommended labels: “Available today”, “In progress”, “Awaiting quote”, “Completed”.
- Never animate a chip into a different meaning without the user confirming the change.
