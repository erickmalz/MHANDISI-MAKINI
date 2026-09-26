# SidebarNav
The fixed 240px charcoal desktop navigation with logo, items and the “Let’s build together” sign-off.

**Consumer provides:** `items` (`{label, icon, href, active, badge}`), `logoSrc` (the dark-background horizontal logo asset `mhandisi-makini-horizontal-dark.png`), optional `footer` (or `false`).

- Background `mm-charcoal-900`; inactive items white at ~85% opacity; active item `mm-charcoal-800` background, yellow icon and `aria-current="page"`.
- Count badges are yellow pills with charcoal numbers and an `aria-label` (“3 unread”).
- Desktop only (≥1024px). On mobile use BottomNav in the customer app.
