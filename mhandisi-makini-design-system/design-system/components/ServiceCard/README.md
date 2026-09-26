# ServiceCard
A tappable category tile: icon, title and one clear next action.

**Consumer provides:** `category` (`electrical`, `plumbing`, `building`, `finishing`), optional `title` and `description`, and `href` (renders a link) or `onClick` (renders a button).

- Soft category tint: electrical on `mm-warning-bg` with a yellow icon disc, plumbing on `mm-info-bg`, building on `mm-success-bg`, finishing on `mm-canvas`.
- Icon motifs: bolt, tap, bricks, paint roller — rounded 2px line, filled for emphasis.
- Hover lifts with `mm-shadow-card`; focus-visible shows `mm-focus-ring`.
- In a mobile carousel keep cards ≥ 44px tall and let the last one bleed off-screen to hint at scroll.
