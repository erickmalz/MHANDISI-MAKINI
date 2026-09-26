/* @ds-bundle: {"format":4,"namespace":"MhandisiMakini","components":[{"name":"Button"},{"name":"TextField"},{"name":"StatusChip"},{"name":"Rating"},{"name":"ServiceCard"},{"name":"ExpertCard"},{"name":"HeroPanel"},{"name":"SidebarNav"},{"name":"BottomNav"},{"name":"Icon"}]} */
(function () {
  var R = window.React, h = R.createElement;
  function cx() { return Array.prototype.filter.call(arguments, Boolean).join(' '); }
  function omit(o, keys) { var r = {}; for (var k in o) if (keys.indexOf(k) < 0) r[k] = o[k]; return r; }

  // Rounded 2px line icons, 24px grid, currentColor.
  var P = {
    search: [['circle', { cx: 11, cy: 11, r: 7 }], ['path', { d: 'M20 20l-4-4' }]],
    pin: [['path', { d: 'M12 21s-7-6.1-7-11a7 7 0 0 1 14 0c0 4.9-7 11-7 11z', f: 1 }], ['circle', { cx: 12, cy: 10, r: 2.5 }]],
    arrow: [['path', { d: 'M5 12h14M13 6l6 6-6 6' }]],
    chevron: [['path', { d: 'M9 6l6 6-6 6' }]],
    star: [['path', { d: 'M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z', f: 1 }]],
    bolt: [['path', { d: 'M13 2.5L4.5 13.5H11l-1 8 8.5-11H12l1-8z', f: 1 }]],
    tap: [['path', { d: 'M3 8.5h9a5 5 0 0 1 5 5V15h-4v-1.5a1 1 0 0 0-1-1H3z', f: 1 }], ['path', { d: 'M7.5 8.5V5.5M5 5h5' }], ['path', { d: 'M15 18.5c0 .8-.7 1.5-1.5 1.5S12 19.3 12 18.5c0-1 1.5-2 1.5-2s1.5 1 1.5 2z' }]],
    bricks: [['rect', { x: 3, y: 5, width: 18, height: 14, rx: 1.5, f: 1 }], ['path', { d: 'M3 9.7h18M3 14.3h18M9 5v4.7M15 5v4.7M6 9.7v4.6M12 9.7v4.6M18 9.7v4.6M9 14.3V19M15 14.3V19' }]],
    roller: [['rect', { x: 3, y: 3.5, width: 14, height: 6, rx: 2, f: 1 }], ['path', { d: 'M17 6.5h3v5.5h-8v2.5' }], ['rect', { x: 10.5, y: 14.5, width: 3, height: 6.5, rx: 1 }]],
    home: [['path', { d: 'M3.5 11L12 4l8.5 7M5.5 9.5V20h13V9.5', f: 1 }], ['path', { d: 'M10 20v-5h4v5' }]],
    briefcase: [['rect', { x: 3, y: 7, width: 18, height: 13, rx: 2, f: 1 }], ['path', { d: 'M8.5 7V5.5a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2V7M3 12.5h18' }]],
    clipboard: [['rect', { x: 5, y: 4.5, width: 14, height: 16.5, rx: 2, f: 1 }], ['path', { d: 'M9 3h6v3H9zM9 11h6M9 15h4' }]],
    chat: [['path', { d: 'M4 5h16v11H9.5L4 20z', f: 1 }]],
    heart: [['path', { d: 'M12 20s-7.5-4.6-9-9.5A4.6 4.6 0 0 1 12 7.2a4.6 4.6 0 0 1 9 3.3C19.5 15.4 12 20 12 20z', f: 1 }]],
    card: [['rect', { x: 3, y: 5, width: 18, height: 14, rx: 2, f: 1 }], ['path', { d: 'M3 10h18M7 15h4' }]],
    gear: [['circle', { cx: 12, cy: 12, r: 3 }], ['path', { d: 'M12 3v2.5M12 18.5V21M3 12h2.5M18.5 12H21M5.6 5.6l1.8 1.8M16.6 16.6l1.8 1.8M5.6 18.4l1.8-1.8M16.6 7.4l1.8-1.8' }], ['circle', { cx: 12, cy: 12, r: 6.5 }]],
    user: [['circle', { cx: 12, cy: 8, r: 4, f: 1 }], ['path', { d: 'M4 21a8 8 0 0 1 16 0' }]],
    bell: [['path', { d: 'M6 16v-5a6 6 0 0 1 12 0v5l1.5 2h-15z', f: 1 }], ['path', { d: 'M10 21h4' }]],
    calendar: [['rect', { x: 3, y: 5, width: 18, height: 16, rx: 2, f: 1 }], ['path', { d: 'M3 10h18M8 3v4M16 3v4' }]],
    shield: [['path', { d: 'M12 3l8 3v6c0 4.8-3.4 8-8 9-4.6-1-8-4.2-8-9V6z', f: 1 }], ['path', { d: 'M8.8 12l2.2 2.2 4.2-4.4' }]],
    users: [['circle', { cx: 9, cy: 8, r: 3.5 }], ['path', { d: 'M2.5 20a6.5 6.5 0 0 1 13 0M16 4.8a3.5 3.5 0 0 1 0 6.4M18 14.2a6.5 6.5 0 0 1 3.5 5.8' }]],
    alert: [['circle', { cx: 12, cy: 12, r: 9 }], ['path', { d: 'M12 7.5v5.5M12 16.5v.01' }]]
  };
  function Icon(props) {
    var name = props.name, size = props.size || 20, filled = props.filled;
    var parts = P[name] || [];
    var label = props.label;
    return h('svg', {
      className: cx('mm-icon', props.className), width: size, height: size, viewBox: '0 0 24 24', fill: 'none',
      stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round',
      role: label ? 'img' : undefined, 'aria-label': label, 'aria-hidden': label ? undefined : true, focusable: 'false'
    }, parts.map(function (p, i) {
      var a = omit(p[1], ['f']); a.key = i;
      if (p[1].f && (filled || name === 'star')) a.fill = name === 'star' || filled === true ? 'var(--mm-yellow-500)' : filled;
      return h(p[0], a);
    }));
  }

  function Button(props) {
    var variant = props.variant || 'primary', size = props.size || 'md';
    var rest = omit(props, ['variant', 'size', 'icon', 'iconRight', 'loading', 'block', 'className', 'children', 'href']);
    var inner = [
      props.loading ? h('span', { key: 's', className: 'mm-button__spinner', 'aria-hidden': true }) : props.icon ? h(Icon, { key: 'i', name: props.icon }) : null,
      h('span', { key: 'l' }, props.children),
      props.iconRight && !props.loading ? h(Icon, { key: 'r', name: props.iconRight }) : null
    ];
    var cls = cx('mm-button', 'mm-button--' + variant, size !== 'md' && 'mm-button--' + size, props.block && 'mm-button--block', props.className);
    if (props.href) return h('a', Object.assign({ className: cls, href: props.href }, rest), inner);
    return h('button', Object.assign({ type: 'button', className: cls, disabled: props.disabled || props.loading, 'aria-busy': props.loading || undefined }, rest), inner);
  }

  var uid = 0;
  function TextField(props) {
    var ref = R.useRef(null); if (!ref.current) ref.current = props.id || 'mm-field-' + (++uid);
    var id = ref.current, errId = id + '-err', hintId = id + '-hint';
    var rest = omit(props, ['label', 'icon', 'trailingIcon', 'error', 'hint', 'className', 'id', 'hideLabel']);
    return h('div', { className: cx('mm-field', props.error && 'mm-field--error', props.className) },
      h('label', { htmlFor: id, className: 'mm-field__label', style: props.hideLabel ? { position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' } : undefined }, props.label),
      h('div', { className: 'mm-field__control' },
        props.icon ? h(Icon, { name: props.icon }) : null,
        h('input', Object.assign({ id: id, className: 'mm-field__input', 'aria-invalid': props.error ? true : undefined,
          'aria-describedby': props.error ? errId : props.hint ? hintId : undefined }, rest)),
        props.trailingIcon ? h(Icon, { name: props.trailingIcon }) : null),
      props.error ? h('p', { id: errId, className: 'mm-field__error', role: 'alert' }, h(Icon, { name: 'alert', size: 16 }), props.error)
        : props.hint ? h('p', { id: hintId, className: 'mm-field__hint' }, props.hint) : null);
  }

  var STATUS = { available: ['success', 'Available today'], progress: ['success', 'In progress'], completed: ['info', 'Completed'],
    awaiting: ['warning', 'Awaiting quote'], error: ['error', 'Error'], offline: ['neutral', 'Offline'], info: ['info', 'Information'] };
  function StatusChip(props) {
    var s = STATUS[props.status || 'available'] || STATUS.info;
    return h('span', { className: cx('mm-chip', 'mm-chip--' + (props.tone || s[0]), props.className), role: props.live ? 'status' : undefined },
      h('span', { className: 'mm-chip__dot', 'aria-hidden': true }), props.children || s[1]);
  }

  function Rating(props) {
    var v = Number(props.value || 0).toFixed(1);
    return h('span', { className: cx('mm-rating', props.badge && 'mm-rating--badge', props.className), 'aria-label': 'Rated ' + v + ' out of 5' + (props.count ? ', ' + props.count + ' reviews' : '') },
      h(Icon, { name: 'star', size: props.badge ? 22 : 18 }), h('span', { 'aria-hidden': true }, v),
      props.count ? h('span', { className: 'mm-rating__count', 'aria-hidden': true }, '(' + props.count + ')') : null);
  }

  var CAT = { electrical: ['bolt', 'Electrical'], plumbing: ['tap', 'Plumbing'], building: ['bricks', 'Building'], finishing: ['roller', 'Finishing'] };
  function ServiceCard(props) {
    var c = CAT[props.category || 'electrical'] || CAT.electrical;
    var tag = props.href ? 'a' : 'button';
    return h(tag, { className: cx('mm-service', 'mm-service--' + (props.category || 'electrical'), props.className), href: props.href, type: props.href ? undefined : 'button', onClick: props.onClick },
      h('span', { className: 'mm-service__icon' }, h(Icon, { name: c[0], size: 28, filled: props.category === 'electrical' ? 'var(--mm-charcoal-900)' : true })),
      h('span', { className: 'mm-service__title' }, props.title || c[1], h(Icon, { name: 'chevron', size: 20 })),
      props.description ? h('span', { className: 'mm-field__hint' }, props.description) : null);
  }

  function initials(n) { return String(n || '').split(/\s+/).map(function (w) { return w[0]; }).join('').slice(0, 2).toUpperCase(); }
  function ExpertCard(props) {
    return h('article', { className: cx('mm-card', 'mm-expert', props.elevated && 'mm-card--elevated', props.className) },
      h('div', { className: 'mm-expert__top' },
        h('div', { className: 'mm-avatar' }, props.avatarSrc ? h('img', { src: props.avatarSrc, alt: '' }) : initials(props.name)),
        h('div', { className: 'mm-expert__meta' },
          h('h3', { className: 'mm-expert__name' }, props.name),
          h(Rating, { value: props.rating, count: props.reviews }),
          h('p', { className: 'mm-expert__trade' }, props.trade),
          h('span', { className: 'mm-expert__loc' }, h(Icon, { name: 'pin', size: 16 }), props.location))),
      props.availability ? h(StatusChip, { status: props.availability }) : null,
      h(Button, { variant: 'secondary', block: true, onClick: props.onViewProfile, href: props.href }, props.actionLabel || 'View profile'));
  }

  function HeroPanel(props) {
    return h('section', { className: cx('mm-hero', props.className) },
      h('h1', { className: 'mm-hero__title' }, props.title),
      props.subtitle ? h('p', { className: 'mm-hero__sub' }, props.subtitle) : null,
      props.children ? h('div', { className: 'mm-hero__actions' }, props.children) : null,
      props.trust ? h('div', { className: 'mm-hero__trust' }, props.trust.map(function (t, i) {
        return h('span', { key: i }, h(Icon, { name: t.icon || 'shield' }), t.label || t);
      })) : null);
  }

  function SidebarNav(props) {
    return h('nav', { className: cx('mm-sidebar', props.className), 'aria-label': props.label || 'Main' },
      props.logoSrc ? h('img', { className: 'mm-sidebar__logo', src: props.logoSrc, alt: 'Mhandisi Makini' }) : null,
      h('ul', { className: 'mm-sidebar__list' }, (props.items || []).map(function (it, i) {
        return h('li', { key: i }, h('a', { className: 'mm-nav-item', href: it.href || '#', 'aria-current': it.active ? 'page' : undefined, onClick: it.onClick },
          h(Icon, { name: it.icon, size: 22 }), h('span', null, it.label),
          it.badge ? h('span', { className: 'mm-nav-item__badge', 'aria-label': it.badge + ' unread' }, it.badge) : null));
      })),
      props.footer !== false ? h('div', { className: 'mm-sidebar__footer' }, props.footer || 'Let’s build together') : null);
  }

  function BottomNav(props) {
    return h('nav', { className: cx('mm-bottomnav', props.className), 'aria-label': props.label || 'Main' }, (props.items || []).map(function (it, i) {
      return h('a', { key: i, className: 'mm-bottomnav__item', href: it.href || '#', 'aria-current': it.active ? 'page' : undefined, onClick: it.onClick },
        h(Icon, { name: it.icon, size: 26, filled: !!it.active }), it.label);
    }));
  }

  window.MhandisiMakini = Object.assign(window.MhandisiMakini || {}, {
    Button: Button, TextField: TextField, StatusChip: StatusChip, Rating: Rating, ServiceCard: ServiceCard,
    ExpertCard: ExpertCard, HeroPanel: HeroPanel, SidebarNav: SidebarNav, BottomNav: BottomNav, Icon: Icon, icons: Object.keys(P)
  });
})();
