/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      // ─── Brand Colors ───────────────────────────────────────────────────
      colors: {
        primary: {
          50:  '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
          950: '#172554',
        },
        // ─── Semantic / Status Colors ──────────────────────────────────────
        success: {
          50:  '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
        },
        warning: {
          50:  '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
        },
        danger: {
          50:  '#fef2f2',
          100: '#fee2e2',
          200: '#fecaca',
          500: '#ef4444',
          600: '#dc2626',
          700: '#b91c1c',
        },
        info: {
          50:  '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
        },
        // ─── Neutral Surface Colors ────────────────────────────────────────
        surface: {
          DEFAULT: '#ffffff',
          50:  '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
        },
      },

      // ─── Typography ────────────────────────────────────────────────────
      fontFamily: {
        sans: [
          'Inter',
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'sans-serif',
        ],
        mono: [
          'JetBrains Mono',
          'Fira Code',
          'Consolas',
          'monospace',
        ],
      },

      // ─── Font Sizes (type scale) ───────────────────────────────────────
      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '0.875rem' }],
        'xs':  ['0.75rem',  { lineHeight: '1rem'    }],
        'sm':  ['0.875rem', { lineHeight: '1.25rem' }],
        'base':['1rem',     { lineHeight: '1.5rem'  }],
        'lg':  ['1.125rem', { lineHeight: '1.75rem' }],
        'xl':  ['1.25rem',  { lineHeight: '1.75rem' }],
        '2xl': ['1.5rem',   { lineHeight: '2rem'    }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
        '4xl': ['2.25rem',  { lineHeight: '2.5rem'  }],
        '5xl': ['3rem',     { lineHeight: '1.16'    }],
        '6xl': ['3.75rem',  { lineHeight: '1.1'     }],
      },

      // ─── Shadows ───────────────────────────────────────────────────────
      boxShadow: {
        'xs':    '0 1px 2px 0 rgb(0 0 0 / 0.04)',
        'sm':    '0 1px 3px 0 rgb(0 0 0 / 0.08), 0 1px 2px -1px rgb(0 0 0 / 0.06)',
        'card':  '0 2px 8px 0 rgb(0 0 0 / 0.06), 0 1px 3px -1px rgb(0 0 0 / 0.05)',
        'card-hover': '0 4px 16px 0 rgb(0 0 0 / 0.1), 0 2px 6px -1px rgb(0 0 0 / 0.06)',
        'modal': '0 20px 60px -12px rgb(0 0 0 / 0.18), 0 8px 24px -8px rgb(0 0 0 / 0.1)',
        'focus': '0 0 0 3px rgb(37 99 235 / 0.15)',
      },

      // ─── Border Radius ─────────────────────────────────────────────────
      borderRadius: {
        'none': '0',
        'sm':   '0.25rem',
        'DEFAULT': '0.375rem',
        'md':   '0.5rem',
        'lg':   '0.625rem',
        'xl':   '0.75rem',
        '2xl':  '1rem',
        '3xl':  '1.5rem',
        'full': '9999px',
      },

      // ─── Spacing Overrides (8px grid friendly) ─────────────────────────
      spacing: {
        '4.5': '1.125rem',
        '13':  '3.25rem',
        '15':  '3.75rem',
        '18':  '4.5rem',
        '22':  '5.5rem',
      },

      // ─── Transitions ───────────────────────────────────────────────────
      transitionTimingFunction: {
        'smooth': 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
      transitionDuration: {
        '150': '150ms',
        '200': '200ms',
        '300': '300ms',
      },

      // ─── Z-Index Scale ──────────────────────────────────────────────────
      zIndex: {
        'sidebar':  '40',
        'header':   '50',
        'dropdown': '60',
        'modal':    '70',
        'toast':    '80',
      },
    },
  },
  plugins: [],
}
