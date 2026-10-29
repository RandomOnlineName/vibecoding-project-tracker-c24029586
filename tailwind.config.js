/** @type {import('tailwindcss').Config} */
// Tokens mirror DESIGN.md §2. Values live as RGB channels in src/index.css
// (dark on :root, light on [data-theme="light"]) so opacity modifiers like /10 still work.
const token = (name) => `rgb(var(--c-${name}) / <alpha-value>)`;

export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Consolas', 'monospace'],
      },
      colors: {
        brand: {
          primary: token('brand-primary'),  // solid button fill, white text
          hover:   token('brand-hover'),
          accent:  token('brand-accent'),   // links, focus ring, active tab rule
        },
        surface: {
          page:     token('surface-page'),
          column:   token('surface-column'),   // header rows, toolbars, sidebars
          card:     token('surface-card'),     // inputs, inset panels
          elevated: token('surface-elevated'), // hover rows
          code:     token('surface-code'),     // monospace buffers
        },
        border: {
          subtle: token('border-subtle'),  // grid lines & dividers (decorative)
          strong: token('border-strong'),  // control outlines, 3:1+ non-text contrast
        },
        text: {
          primary: token('text-primary'),
          muted:   token('text-muted'),   // metadata, labels
          subtle:  token('text-subtle'),  // placeholders only
        },
        // Scale 1: Task Type
        type: {
          urgent:     token('type-urgent'),
          bug:        token('type-bug'),
          feature:    token('type-feature'),
          additional: token('type-additional'),
        },
        // Scale 2: Significance / Deadline Urgency
        significance: {
          today:  token('significance-today'),
          soon:   token('significance-soon'),
          sprint: token('significance-sprint'),
          later:  token('significance-later'),
        },
        status: {
          success: token('status-success'),
          warning: token('status-warning'),
          danger:  token('status-danger'),
        },
      },
      keyframes: {
        'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
      },
      animation: {
        'fade-in': 'fade-in 150ms ease-out',
      },
    },
  },
  plugins: [],
};
