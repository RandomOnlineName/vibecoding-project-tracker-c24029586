/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: '#0f172a',
          accent: '#f97316',
        },
        surface: {
          page: '#fef9ee',
          card: '#ffffff',
        },
        type: {
          feature: '#10b981',
          bug: '#ef4444',
        },
        due: {
          safe: '#10b981',
          warning: '#f59e0b',
          overdue: '#dc2626',
          neutral: '#94a3b8',
        },
        feature: '#10b981', // compatibility token
        bug: '#ef4444',     // compatibility token
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
        '4xl': '2rem',
      },
    },
  },
  plugins: [],
};
