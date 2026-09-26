// Mhandisi Makini components — React 18+, no dependencies.
// Requires tokens.css and components.css to be imported once at the app root.
import * as React from 'react';

const cx = (...c: Array<string | false | null | undefined>) => c.filter(Boolean).join(' ');

/* ---------- Icons: rounded 2px line, 24px grid, currentColor ---------- */
type Shape = [tag: 'path' | 'circle' | 'rect', attrs: Record<string, string | number>, fillable?: boolean];
const ICONS = {
  search: [['circle', { cx: 11, cy: 11, r: 7 }], ['path', { d: 'M20 20l-4-4' }]],
  pin: [['path', { d: 'M12 21s-7-6.1-7-11a7 7 0 0 1 14 0c0 4.9-7 11-7 11z' }, true], ['circle', { cx: 12, cy: 10, r: 2.5 }]],
  arrow: [['path', { d: 'M5 12h14M13 6l6 6-6 6' }]],
  chevron: [['path', { d: 'M9 6l6 6-6 6' }]],
  star: [['path', { d: 'M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z' }, true]],
  bolt: [['path', { d: 'M13 2.5L4.5 13.5H11l-1 8 8.5-11H12l1-8z' }, true]],
  tap: [['path', { d: 'M3 8.5h9a5 5 0 0 1 5 5V15h-4v-1.5a1 1 0 0 0-1-1H3z' }, true], ['path', { d: 'M7.5 8.5V5.5M5 5h5' }], ['path', { d: 'M15 18.5c0 .8-.7 1.5-1.5 1.5S12 19.3 12 18.5c0-1 1.5-2 1.5-2s1.5 1 1.5 2z' }]],
  bricks: [['rect', { x: 3, y: 5, width: 18, height: 14, rx: 1.5 }, true], ['path', { d: 'M3 9.7h18M3 14.3h18M9 5v4.7M15 5v4.7M6 9.7v4.6M12 9.7v4.6M18 9.7v4.6M9 14.3V19M15 14.3V19' }]],
  roller: [['rect', { x: 3, y: 3.5, width: 14, height: 6, rx: 2 }, true], ['path', { d: 'M17 6.5h3v5.5h-8v2.5' }], ['rect', { x: 10.5, y: 14.5, width: 3, height: 6.5, rx: 1 }]],
  home: [['path', { d: 'M3.5 11L12 4l8.5 7M5.5 9.5V20h13V9.5' }, true], ['path', { d: 'M10 20v-5h4v5' }]],
  briefcase: [['rect', { x: 3, y: 7, width: 18, height: 13, rx: 2 }, true], ['path', { d: 'M8.5 7V5.5a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2V7M3 12.5h18' }]],
  clipboard: [['rect', { x: 5, y: 4.5, width: 14, height: 16.5, rx: 2 }, true], ['path', { d: 'M9 3h6v3H9zM9 11h6M9 15h4' }]],
  chat: [['path', { d: 'M4 5h16v11H9.5L4 20z' }, true]],
  heart: [['path', { d: 'M12 20s-7.5-4.6-9-9.5A4.6 4.6 0 0 1 12 7.2a4.6 4.6 0 0 1 9 3.3C19.5 15.4 12 20 12 20z' }, true]],
  card: [['rect', { x: 3, y: 5, width: 18, height: 14, rx: 2 }, true], ['path', { d: 'M3 10h18M7 15h4' }]],
  gear: [['circle', { cx: 12, cy: 12, r: 3 }], ['path', { d: 'M12 3v2.5M12 18.5V21M3 12h2.5M18.5 12H21M5.6 5.6l1.8 1.8M16.6 16.6l1.8 1.8M5.6 18.4l1.8-1.8M16.6 7.4l1.8-1.8' }], ['circle', { cx: 12, cy: 12, r: 6.5 }]],
  user: [['circle', { cx: 12, cy: 8, r: 4 }, true], ['path', { d: 'M4 21a8 8 0 0 1 16 0' }]],
  bell: [['path', { d: 'M6 16v-5a6 6 0 0 1 12 0v5l1.5 2h-15z' }, true], ['path', { d: 'M10 21h4' }]],
  calendar: [['rect', { x: 3, y: 5, width: 18, height: 16, rx: 2 }, true], ['path', { d: 'M3 10h18M8 3v4M16 3v4' }]],
  shield: [['path', { d: 'M12 3l8 3v6c0 4.8-3.4 8-8 9-4.6-1-8-4.2-8-9V6z' }, true], ['path', { d: 'M8.8 12l2.2 2.2 4.2-4.4' }]],
  users: [['circle', { cx: 9, cy: 8, r: 3.5 }], ['path', { d: 'M2.5 20a6.5 6.5 0 0 1 13 0M16 4.8a3.5 3.5 0 0 1 0 6.4M18 14.2a6.5 6.5 0 0 1 3.5 5.8' }]],
  alert: [['circle', { cx: 12, cy: 12, r: 9 }], ['path', { d: 'M12 7.5v5.5M12 16.5v.01' }]],
} satisfies Record<string, Shape[]>;
export type IconName = keyof typeof ICONS;

export interface IconProps { name: IconName; size?: number; /** true = yellow fill (selected state) or a CSS colour */ filled?: boolean | string; /** accessible name; omit when decorative */ label?: string; className?: string; }
export function Icon({ name, size = 20, filled, label, className }: IconProps) {
  return (
    <svg className={cx('mm-icon', className)} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" focusable="false"
      role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : true}>
      {(ICONS[name] as Shape[]).map(([Tag, attrs, fillable], i) => {
        const fill = fillable && (name === 'star' || filled === true ? 'var(--mm-yellow-500)' : typeof filled === 'string' ? filled : undefined);
        return <Tag key={i} {...(attrs as any)} fill={fill} data-fill={fillable ? '' : undefined} />;
      })}
    </svg>
  );
}

/* ---------- Button ---------- */
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'tertiary' | 'destructive';
  size?: 'sm' | 'md' | 'lg';
  icon?: IconName; iconRight?: IconName; loading?: boolean; block?: boolean;
  /** renders an <a> styled as a button */ href?: string;
}
export function Button({ variant = 'primary', size = 'md', icon, iconRight, loading, block, href, className, children, disabled, ...rest }: ButtonProps) {
  const cls = cx('mm-button', `mm-button--${variant}`, size !== 'md' && `mm-button--${size}`, block && 'mm-button--block', className);
  const inner = (<>
    {loading ? <span className="mm-button__spinner" aria-hidden="true" /> : icon ? <Icon name={icon} /> : null}
    <span>{children}</span>
    {iconRight && !loading ? <Icon name={iconRight} /> : null}
  </>);
  if (href) return <a className={cls} href={href} {...(rest as React.AnchorHTMLAttributes<HTMLAnchorElement>)}>{inner}</a>;
  return <button type="button" className={cls} disabled={disabled || loading} aria-busy={loading || undefined} {...rest}>{inner}</button>;
}

/* ---------- TextField ---------- */
export interface TextFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string; hideLabel?: boolean; icon?: IconName; trailingIcon?: IconName; hint?: string; error?: string;
}
export function TextField({ label, hideLabel, icon, trailingIcon, hint, error, className, id, ...rest }: TextFieldProps) {
  const auto = React.useId(); const fid = id ?? auto;
  const describedBy = error ? `${fid}-err` : hint ? `${fid}-hint` : undefined;
  return (
    <div className={cx('mm-field', error && 'mm-field--error', className)}>
      <label htmlFor={fid} className={hideLabel ? 'mm-sr-only' : 'mm-field__label'}>{label}</label>
      <div className="mm-field__control">
        {icon && <Icon name={icon} />}
        <input id={fid} className="mm-field__input" aria-invalid={error ? true : undefined} aria-describedby={describedBy} {...rest} />
        {trailingIcon && <Icon name={trailingIcon} />}
      </div>
      {error ? <p id={`${fid}-err`} className="mm-field__error" role="alert"><Icon name="alert" size={16} />{error}</p>
        : hint ? <p id={`${fid}-hint`} className="mm-field__hint">{hint}</p> : null}
    </div>
  );
}

/* ---------- StatusChip ---------- */
const STATUS = {
  available: ['success', 'Available today'], progress: ['success', 'In progress'], awaiting: ['warning', 'Awaiting quote'],
  completed: ['info', 'Completed'], offline: ['neutral', 'Offline'], error: ['error', 'Error'], info: ['info', 'Information'],
} as const;
export type Status = keyof typeof STATUS;
export interface StatusChipProps { status?: Status; tone?: 'success' | 'info' | 'warning' | 'error' | 'neutral'; live?: boolean; children?: React.ReactNode; className?: string; }
export function StatusChip({ status = 'available', tone, live, children, className }: StatusChipProps) {
  const [t, label] = STATUS[status];
  return (
    <span className={cx('mm-chip', `mm-chip--${tone ?? t}`, className)} role={live ? 'status' : undefined}>
      <span className="mm-chip__dot" aria-hidden="true" />{children ?? label}
    </span>
  );
}

/* ---------- Rating ---------- */
export interface RatingProps { value: number; count?: number; badge?: boolean; className?: string; }
export function Rating({ value, count, badge, className }: RatingProps) {
  const v = value.toFixed(1);
  return (
    <span className={cx('mm-rating', badge && 'mm-rating--badge', className)} aria-label={`Rated ${v} out of 5${count ? `, ${count} reviews` : ''}`}>
      <Icon name="star" size={badge ? 22 : 18} /><span aria-hidden="true">{v}</span>
      {count ? <span className="mm-rating__count" aria-hidden="true">({count})</span> : null}
    </span>
  );
}

/* ---------- ServiceCard ---------- */
const CATEGORY = { electrical: ['bolt', 'Electrical'], plumbing: ['tap', 'Plumbing'], building: ['bricks', 'Building'], finishing: ['roller', 'Finishing'] } as const;
export interface ServiceCardProps { category: keyof typeof CATEGORY; title?: string; description?: string; href?: string; onClick?: () => void; className?: string; }
export function ServiceCard({ category, title, description, href, onClick, className }: ServiceCardProps) {
  const [icon, label] = CATEGORY[category];
  const body = (<>
    <span className="mm-service__icon"><Icon name={icon} size={28} filled={category === 'electrical' ? 'var(--mm-charcoal-900)' : true} /></span>
    <span className="mm-service__title">{title ?? label}<Icon name="chevron" /></span>
    {description && <span className="mm-field__hint">{description}</span>}
  </>);
  const cls = cx('mm-service', `mm-service--${category}`, className);
  return href ? <a className={cls} href={href}>{body}</a> : <button type="button" className={cls} onClick={onClick}>{body}</button>;
}

/* ---------- ExpertCard ---------- */
export interface ExpertCardProps {
  name: string; trade: string; rating: number; reviews?: number; location: string; availability?: Status;
  avatarSrc?: string; elevated?: boolean; actionLabel?: string; href?: string; onViewProfile?: () => void; className?: string;
}
export function ExpertCard(p: ExpertCardProps) {
  const initials = p.name.split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase();
  return (
    <article className={cx('mm-card', 'mm-expert', p.elevated && 'mm-card--elevated', p.className)}>
      <div className="mm-expert__top">
        <div className="mm-avatar">{p.avatarSrc ? <img src={p.avatarSrc} alt="" /> : initials}</div>
        <div className="mm-expert__meta">
          <h3 className="mm-expert__name">{p.name}</h3>
          <Rating value={p.rating} count={p.reviews} />
          <p className="mm-expert__trade">{p.trade}</p>
          <span className="mm-expert__loc"><Icon name="pin" size={16} />{p.location}</span>
        </div>
      </div>
      {p.availability && <StatusChip status={p.availability} />}
      <Button variant="secondary" block href={p.href} onClick={p.onViewProfile}>{p.actionLabel ?? 'View profile'}</Button>
    </article>
  );
}

/* ---------- HeroPanel ---------- */
export interface HeroPanelProps { title: string; subtitle?: string; trust?: Array<{ icon?: IconName; label: string }>; children?: React.ReactNode; className?: string; }
export function HeroPanel({ title, subtitle, trust, children, className }: HeroPanelProps) {
  return (
    <section className={cx('mm-hero', className)}>
      <h1 className="mm-hero__title">{title}</h1>
      {subtitle && <p className="mm-hero__sub">{subtitle}</p>}
      {children && <div className="mm-hero__actions">{children}</div>}
      {trust && <div className="mm-hero__trust">{trust.map((t, i) => <span key={i}><Icon name={t.icon ?? 'shield'} />{t.label}</span>)}</div>}
    </section>
  );
}

/* ---------- Navigation ---------- */
export interface NavItem { label: string; icon: IconName; href?: string; active?: boolean; badge?: number; onClick?: () => void; }
export interface SidebarNavProps { items: NavItem[]; /** dark-background logo, e.g. /brand/mhandisi-makini-horizontal-dark.png */ logoSrc?: string; footer?: React.ReactNode | false; label?: string; className?: string; }
export function SidebarNav({ items, logoSrc, footer, label = 'Main', className }: SidebarNavProps) {
  return (
    <nav className={cx('mm-sidebar', className)} aria-label={label}>
      {logoSrc && <img className="mm-sidebar__logo" src={logoSrc} alt="Mhandisi Makini" />}
      <ul className="mm-sidebar__list">
        {items.map((it, i) => (
          <li key={i}><a className="mm-nav-item" href={it.href ?? '#'} aria-current={it.active ? 'page' : undefined} onClick={it.onClick}>
            <Icon name={it.icon} size={22} /><span>{it.label}</span>
            {it.badge ? <span className="mm-nav-item__badge" aria-label={`${it.badge} unread`}>{it.badge}</span> : null}
          </a></li>
        ))}
      </ul>
      {footer !== false && <div className="mm-sidebar__footer">{footer ?? 'Let’s build together'}</div>}
    </nav>
  );
}

export interface BottomNavProps { items: NavItem[]; label?: string; className?: string; }
/** Main customer app only — never in dense expert/admin workflows. */
export function BottomNav({ items, label = 'Main', className }: BottomNavProps) {
  return (
    <nav className={cx('mm-bottomnav', className)} aria-label={label}>
      {items.map((it, i) => (
        <a key={i} className="mm-bottomnav__item" href={it.href ?? '#'} aria-current={it.active ? 'page' : undefined} onClick={it.onClick}>
          <Icon name={it.icon} size={26} />{it.label}
        </a>
      ))}
    </nav>
  );
}
