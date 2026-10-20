/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: '#3574f0',
          accent: '#60a5fa',
        },
        surface: {
          page: '#1e1f22',
          column: '#25272b',
          card: '#2b2d30',
          elevated: '#323438',
        },
        border: {
          subtle: '#393b40',
        },
        text: {
          primary: '#dfe1e5',
          muted: '#868a91',
        },
        // Scale 1: Task Type
        type: {
          urgent: '#ef4444',
          bug: '#f97316',
          feature: '#3b82f6',
          additional: '#a855f7',
        },
        // Scale 2: Significance / Deadline Urgency
        significance: {
          today: '#f43f5e',
          soon: '#f59e0b',
          sprint: '#38bdf8',
          later: '#64748b',
        },
        // Legacy / milestone alias tokens
        due: {
          safe: '#38bdf8',
          warning: '#f59e0b',
          overdue: '#f43f5e',
          neutral: '#64748b',
        },
        feature: '#3b82f6',
        bug: '#f97316',
      },
    },
  },
  plugins: [],
};
