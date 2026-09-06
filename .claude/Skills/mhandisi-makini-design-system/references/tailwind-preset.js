/**
 * MHANDISI MAKINI — Tailwind preset
 * Brand Guidelines v1.1 (September 2026)
 *
 * Usage (tailwind.config.js):
 *   module.exports = {
 *     presets: [require('./.claude/skills/mhandisi-makini-design-system/references/tailwind-preset.js')],
 *     content: ['./src/**\/*.{js,ts,jsx,tsx,html}'],
 *   }
 *
 * Rules the preset cannot enforce — enforce them in review:
 *   • text-mm-charcoal on bg-mm-yellow. NEVER text-white on yellow (1.66:1).
 *   • NEVER text-mm-yellow on white (1.66:1).
 *   • One yellow primary action per view.
 *   • Every status colour ships with a visible word.
 */

module.exports = {
  theme: {
    extend: {
      colors: {
        mm: {
          yellow: '#FFBE00',          // Site Yellow — accent + primary action only
          'yellow-pressed': '#E6AB00',
          charcoal: '#292D30',
          'charcoal-hover': '#3A3F43',
          white: '#FFFFFF',
          concrete: '#F5F6F7',
          slate: '#56616B',
          border: '#E3E5E7',
          'border-strong': '#C7CBCF',
          success: '#18794E',
          warning: '#8A5800',
          error: '#B42318',
          info: '#175CD3',
          'success-surface': '#ECF6F1',
          'warning-surface': '#FBF3E6',
          'error-surface': '#FDF0EF',
          'info-surface': '#EDF2FC',
        },
      },

      fontFamily: {
        mm: [
          '"DejaVu Sans"', '-apple-system', 'BlinkMacSystemFont',
          '"Segoe UI"', 'Roboto', 'Helvetica', 'Arial', 'sans-serif',
        ],
      },

      fontSize: {
        'mm-hero':       ['2.25rem', { lineHeight: '1.2', fontWeight: '700' }], // 36px (32–40)
        'mm-page-title': ['1.75rem', { lineHeight: '1.2', fontWeight: '700' }], // 28px
        'mm-section':    ['1.25rem', { lineHeight: '1.3', fontWeight: '700' }], // 20px
        'mm-body':       ['1rem',    { lineHeight: '1.5' }],                    // 16px
        'mm-label':      ['0.875rem',{ lineHeight: '1.4' }],                    // 14px
      },

      // 8px base unit, 4px micro adjustments.
      spacing: {
        'mm-1': '4px',
        'mm-2': '8px',
        'mm-3': '12px',
        'mm-4': '16px',  // card padding / mobile margin
        'mm-5': '24px',  // minimum section separation
        'mm-6': '32px',  // desktop margin
        'mm-7': '40px',
        'mm-8': '48px',  // minimum touch target
      },

      borderRadius: {
        mm: '8px',
        'mm-sm': '4px',
      },

      minHeight:  { 'mm-target': '48px' },
      minWidth:   { 'mm-target': '48px', 'mm-logo': '160px', 'mm-symbol': '32px' },
      maxWidth:   { 'mm-content': '72ch' },

      strokeWidth: { mm: '2' },  // 24px icon grid, ~2px strokes
    },
  },
};
