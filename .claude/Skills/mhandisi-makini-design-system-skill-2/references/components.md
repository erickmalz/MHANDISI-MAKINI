# Components — API and markup

Two ways to use each component:
- **React** — `import { Button, … } from '<react-path>'` (the file `install.mjs` copied from `assets/react/mhandisi-makini.tsx`). Props below.
- **Any other stack** (HTML, Vue, Svelte, server templates) — copy the markup. All styling comes from `components.css`; never restyle `mm-` classes inline.

Every component must cover default, hover, focus-visible, disabled, loading, error, empty and success where they apply.

## Contents
Button · TextField · StatusChip · Rating · ServiceCard · ExpertCard · HeroPanel · SidebarNav · BottomNav · Icon · Extending

## Button
`<Button variant="primary|secondary|tertiary|destructive" size="sm|md|lg" icon iconRight loading block href>`

| Variant | Look | Use |
|---|---|---|
| primary | yellow fill, charcoal label, hover yellow-600 | ONE main action per section ("Book an expert") |
| secondary | white, 1px charcoal border | alternative ("Find expert", "View profile") |
| tertiary | transparent | low emphasis ("See all") |
| destructive | error red, white label (4.4:1 — keep short, bold) | confirmed irreversible actions |

```html
<button type="button" class="mm-button mm-button--primary">Book service <svg class="mm-icon" aria-hidden="true">…</svg></button>
<a class="mm-button mm-button--secondary mm-button--block" href="/experts/1">View profile</a>
<button type="button" class="mm-button mm-button--primary" disabled aria-busy="true"><span class="mm-button__spinner" aria-hidden="true"></span>Booking…</button>
```
Sizes: `mm-button--sm`, default, `mm-button--lg` (52px). All ≥44px tall. Labels: verb + object, sentence case.

## TextField
`<TextField label hideLabel icon trailingIcon hint error …inputProps>` — `label` is required.
```html
<div class="mm-field">
  <label class="mm-field__label" for="loc">Location</label>
  <div class="mm-field__control">
    <input class="mm-field__input" id="loc" placeholder="Enter your location" aria-describedby="loc-hint">
    <svg class="mm-icon" aria-hidden="true">…pin</svg>
  </div>
  <p class="mm-field__hint" id="loc-hint">e.g. Kinondoni, Dar es Salaam</p>
</div>
```
- Search: icon before the input, `<label class="mm-sr-only">`.
- Error: add `mm-field--error` on the wrapper, `aria-invalid="true"` on the input, and
  `<p class="mm-field__error" id="loc-err" role="alert"><svg class="mm-icon">…alert</svg>Enter a location so we can find experts near you.</p>`.
- Placeholder is an example, never the label.

## StatusChip
`<StatusChip status="available|progress|awaiting|completed|offline|error|info" tone? live? >{custom label?}</StatusChip>`
```html
<span class="mm-chip mm-chip--success"><span class="mm-chip__dot" aria-hidden="true"></span>Available today</span>
```
Tones: available/progress → success · awaiting → warning · completed → info · offline → neutral · failures → error.
Label text stays `--mm-text` (semantic colours fail AA as small text on their tints). `live` adds `role="status"`.

## Rating
`<Rating value={4.8} count={126} badge? />`
```html
<span class="mm-rating" aria-label="Rated 4.8 out of 5, 126 reviews"><svg class="mm-icon" aria-hidden="true">…star</svg><span aria-hidden="true">4.8</span><span class="mm-rating__count" aria-hidden="true">(126)</span></span>
```
Never show a rating as the only trust signal.

## ServiceCard
`<ServiceCard category="electrical|plumbing|building|finishing" title? description? href|onClick />`
```html
<a class="mm-service mm-service--electrical" href="/services/electrical">
  <span class="mm-service__icon"><svg class="mm-icon" aria-hidden="true">…bolt</svg></span>
  <span class="mm-service__title">Electrical <svg class="mm-icon" aria-hidden="true">…chevron</svg></span>
</a>
```
Motifs: bolt / tap / bricks / paint roller. Tints: warning-bg (with yellow icon disc) / info-bg / success-bg / canvas.

## ExpertCard
`<ExpertCard name trade rating reviews? location availability avatarSrc? elevated? href|onViewProfile actionLabel? />`
Must show all six: avatar, name, rating, trade, location, availability — plus "View profile".
```html
<article class="mm-card mm-expert">
  <div class="mm-expert__top">
    <div class="mm-avatar"><img src="…" alt=""></div>
    <div class="mm-expert__meta">
      <h3 class="mm-expert__name">Daniel K.</h3>
      <span class="mm-rating" aria-label="Rated 4.9 out of 5">…</span>
      <p class="mm-expert__trade">Electrical</p>
      <span class="mm-expert__loc"><svg class="mm-icon" aria-hidden="true">…pin</svg>Nairobi, Kenya</span>
    </div>
  </div>
  <span class="mm-chip mm-chip--success"><span class="mm-chip__dot"></span>Available today</span>
  <a class="mm-button mm-button--secondary mm-button--block" href="/experts/daniel-k">View profile</a>
</article>
```
Generic cards: `mm-card` (24px padding), `mm-card--compact` (16px), `mm-card--elevated` (shadow; featured/interactive only).

## HeroPanel
`<HeroPanel title subtitle trust={[{icon,label}]}>{search TextField + one primary Button}</HeroPanel>`
```html
<section class="mm-hero">
  <h1 class="mm-hero__title">Find a skilled expert</h1>
  <p class="mm-hero__sub">Get trusted help for your next project.</p>
  <div class="mm-hero__actions"><!-- mm-field search --><button class="mm-button mm-button--primary mm-button--lg">Book an expert</button></div>
  <div class="mm-hero__trust"><span>…shield Trusted professionals</span><span>…users Quality work</span><span>…gear Stronger communities</span></div>
</section>
```

## SidebarNav (desktop ≥1024px)
`<SidebarNav logoSrc="/brand/mhandisi-makini-horizontal-dark.png" items={[{label, icon, href, active, badge}]} footer? />`
```html
<nav class="mm-sidebar" aria-label="Main">
  <img class="mm-sidebar__logo" src="/brand/mhandisi-makini-horizontal-dark.png" alt="Mhandisi Makini">
  <ul class="mm-sidebar__list">
    <li><a class="mm-nav-item" href="/" aria-current="page"><svg class="mm-icon">…home</svg>Home</a></li>
    <li><a class="mm-nav-item" href="/messages"><svg class="mm-icon">…chat</svg>Messages<span class="mm-nav-item__badge" aria-label="3 unread">3</span></a></li>
  </ul>
  <div class="mm-sidebar__footer">Let's build together</div>
</nav>
```
Items: Home (home), Find Experts (search), My Projects (briefcase), Messages (chat), Saved (heart), Payments (card), Settings (gear).

## BottomNav (mobile customer app only — never expert/admin tools)
`<BottomNav items={[{label:'Home',icon:'home',active:true},{label:'Explore',icon:'search'},{label:'Projects',icon:'clipboard'},{label:'Profile',icon:'user'}]} />`
Active item: `aria-current="page"`, filled yellow icon, bold label.

## Icon
`<Icon name size? filled? label? />` — names: search pin arrow chevron star bolt tap bricks roller home briefcase clipboard chat heart card gear user bell calendar shield users alert.
Rounded 2px line, 24px grid, `currentColor`; filled only for selected states. If the project already uses `lucide-react`, its icons match the style (Search, MapPin, ArrowRight, ChevronRight, Star, Zap, BrickWall, PaintRoller, Home, Briefcase, ClipboardList, MessageSquare, Heart, CreditCard, Settings, User, Bell, Calendar, ShieldCheck, Users, AlertCircle).
Decorative icons: `aria-hidden`. Icon-only buttons: `aria-label` on the button.

## Extending
Need a component that isn't here (modal, tabs, table, toast…)? Build it from tokens only, matching these conventions:
`mm-` BEM class names · 12px radius · 1px `--mm-border` · white surface on canvas · `--mm-shadow-float` for overlays · 200ms ease-out entrance · focus ring on every control · Manrope titles / Inter text · one yellow action. Add it to the project's component file, not to `components.css` from the kit.
