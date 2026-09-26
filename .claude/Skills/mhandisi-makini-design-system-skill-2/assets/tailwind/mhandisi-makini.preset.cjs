// Tailwind v3 preset: module.exports = { presets: [require('./mhandisi-makini.preset.cjs')], ... }
// Keep tokens.css + components.css imported — they define the variables, fonts and mm- components.
/** @type {import('tailwindcss').Config} */
module.exports = {
  theme: {
    extend: {
      colors: {
        mm: {
          yellow: { 500: 'var(--mm-yellow-500)', 600: 'var(--mm-yellow-600)' },
          charcoal: { 800: 'var(--mm-charcoal-800)', 900: 'var(--mm-charcoal-900)' },
          white: 'var(--mm-white)', canvas: 'var(--mm-canvas)', surface: 'var(--mm-surface)', border: 'var(--mm-border)',
          text: 'var(--mm-text)', muted: 'var(--mm-text-muted)', subtle: 'var(--mm-text-subtle)',
          success: 'var(--mm-success)', 'success-bg': 'var(--mm-success-bg)',
          info: 'var(--mm-info)', 'info-bg': 'var(--mm-info-bg)',
          warning: 'var(--mm-warning)', 'warning-bg': 'var(--mm-warning-bg)',
          error: 'var(--mm-error)', 'error-bg': 'var(--mm-error-bg)', focus: 'var(--mm-focus)',
        },
      },
      fontFamily: { heading: ['Manrope', 'system-ui', 'sans-serif'], body: ['Inter', 'system-ui', 'sans-serif'] },
      borderRadius: { 'mm-sm': '8px', 'mm-md': '12px', 'mm-lg': '16px', 'mm-pill': '999px' },
      boxShadow: { 'mm-card': 'var(--mm-shadow-card)', 'mm-float': 'var(--mm-shadow-float)', 'mm-focus': 'var(--mm-focus-ring)' },
      maxWidth: { 'mm-content': '1440px' },
      width: { 'mm-sidebar': '240px' },
      minHeight: { 'mm-touch': '44px' },
      transitionDuration: { 'mm-fast': '160ms', 'mm-overlay': '200ms' },
    },
  },
};
