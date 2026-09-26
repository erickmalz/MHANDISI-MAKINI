# Page recipes

Order on every screen: brand → purpose → essential info → one next action. Define loading (skeleton bars in `--mm-border`), empty, error and success states.

## App shell
- Desktop ≥1024px: `display:grid; grid-template-columns: var(--mm-sidebar-width) 1fr; min-height:100vh` on `--mm-canvas`. Content column: 32px padding, `max-width: var(--mm-content-max)`, 24px gaps.
- Tablet 768–1023px: sidebar collapses to a top bar with a menu button (`aria-label="Open menu"`, `aria-expanded`); menu opens as a charcoal drawer (200ms).
- Mobile <768px: one column, 16px gutters, BottomNav fixed at the bottom (customer app only; add bottom padding so content clears it).

## Desktop dashboard
1. Top bar: location select ("Nairobi, Kenya" + pin), wide search field ("Search by service or location"), bell button (`aria-label="Notifications"`, yellow unread dot), avatar + name menu.
2. HeroPanel: "Find a skilled expert" / "Get trusted help for your next project." + search + "Book an expert"; friendly worker illustration on the right if available (never stock photos or hazard imagery).
3. "Popular services" (h2) + tertiary "See all" link → 3–4 column ServiceCard grid, 24px gap.
4. Bottom row (2fr / 1fr): "Featured experts" (3 ExpertCards) · "Your project" card (photo, title e.g. "Kitchen wiring", In progress chip, progress bar: 8px tall, `--mm-border` track, `--mm-success` fill, `role="progressbar"` with aria values).

## Mobile customer home
1. Charcoal header, bottom corners `--mm-radius-lg`: dark logo (horizontal-dark) + bell button; "Hello, {firstName}" (`mm-h1`, white); "What do you need fixed?" (white, 80% opacity).
2. White search field with a filter icon button, overlapping the header's bottom edge by ~24px.
3. "Popular services" + "See all": horizontal scroll (`overflow-x:auto; scroll-snap-type:x mandatory`) of compact tiles (~120px wide, icon + label); the last tile bleeds off-screen.
4. "Top rated near you": one ExpertCard.
5. Full-width `mm-button--primary mm-button--lg`: calendar icon + "Book an expert" + chevron.
6. Promo card on `--mm-success-bg`: "Reliable professionals for a better tomorrow." (Manrope 700), short yellow rule, "Let's build together" in muted.
7. BottomNav: Home · Explore · Projects · Profile.

## Expert profile
Header card: large avatar (96px), name (`mm-h1`), trade, Rating with review count, location, availability chip. Primary "Book {firstName}" + secondary "Message". Sections: About, Services & rates (units: `TZS 150,000`), Past projects (image grid), Reviews. Never a star rating without the count.

## Booking flow
Steps: service → details (TextFields with labels, date via calendar) → review → confirmation. One primary per step ("Continue to review", "Confirm booking"); tertiary "Back". Show "Booking confirmed." only after the server confirms; on failure "Booking not sent. Try again." with the form preserved.

## Empty / error / loading
- Empty: short friendly line + one action. "No experts found in this area yet. Try another location." + secondary "Change location".
- Error: say what happened and how to recover; never a raw code alone.
- Loading: skeleton blocks matching the final layout; buttons use `loading` (spinner + `aria-busy`), never a blank screen.
