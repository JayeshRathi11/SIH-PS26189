/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        slate: {
          950: '#090d16',
          900: '#0f172a',
          850: '#151e32',
          800: '#1e293b',
          700: '#334155',
        },
        cyan: {
          500: '#06b6d4',
          400: '#22d3ee',
        },
        emerald: {
          500: '#10b981',
        },
        amber: {
          500: '#f59e0b',
        },
        rose: {
          500: '#f43f5e',
        }
      }
    },
  },
  plugins: [],
}
