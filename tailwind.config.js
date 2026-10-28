/** @type {import('tailwindcss').Config} */
// Tokens mirror DESIGN.md §2. Contrast ratios are measured against surface-page (#17181b).
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
          primary: '#2563eb',  // solid button fill, white text 5.2:1
          hover:   '#1d4ed8',
          accent:  '#7cb4ff',  // links, focus ring, active tab rule: 8.3:1
        },
        surface: {
          page:     '#17181b',
          column:   '#1f2125', // header rows, toolbars, sidebars
          card:     '#25272b', // inputs, inset panels
          elevated: '#2e3035', // hover rows
          code:     '#111214', // monospace buffers
        },
        border: {
          subtle: '#3a3d44',   // grid lines & dividers (decorative)
          strong: '#6b7079',   // control outlines, 3.6:1 non-text contrast
        },
        text: {
          primary: '#ececef',  // 15.1:1
          muted:   '#b0b4bc',  // 8.5:1 — metadata, labels
          subtle:  '#8f949c',  // 5.8:1 — placeholders only
        },
        // Scale 1: Task Type (400-weight shades so text clears 4.5:1)
        type: {
          urgent:     '#f87171',
          bug:        '#fb923c',
          feature:    '#60a5fa',
          additional: '#c084fc',
        },
        // Scale 2: Significance / Deadline Urgency
        significance: {
          today:  '#fb7185',
          soon:   '#fbbf24',
          sprint: '#38bdf8',
          later:  '#94a3b8',
        },
        status: {
          success: '#4ade80',
          warning: '#fbbf24',
          danger:  '#f87171',
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
