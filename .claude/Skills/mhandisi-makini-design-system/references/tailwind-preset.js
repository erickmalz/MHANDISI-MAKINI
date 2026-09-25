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
          yellow: '#FFB800',          // helmet yellow — accent + primary action only
          'yellow-pressed': '#E6A600',
          charcoal: '#252A2D',
          'charcoal-hover': '#343A3F',
          white: '#FFFFFF',
          concrete: '#F7F8F6',
          slate: '#5E6872',
          border: '#DCE1E5',
          'border-strong': '#7B858E',
          success: '#168A56',
          warning: '#A96800',
          error: '#D64545',
          info: '#2667D9',
          'success-surface': '#E9F7EF',
          'warning-surface': '#FFF3DB',
          'error-surface': '#FEEBEB',
          'info-surface': '#EAF1FF',
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
