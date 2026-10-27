/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        college: {
          50: '#eef6ff',
          100: '#d9eaff',
          200: '#bcd9ff',
          300: '#8ec2ff',
          400: '#59a0ff',
          500: '#327bf7',
          600: '#1b5ceb',
          700: '#1446d8',
          800: '#163ab0',
          900: '#17348b',
          950: '#0d1d52',
        },
        surface: {
          light: '#f8fafc',
          dark: '#0f172a',
          card: '#1e293b',
          border: '#334155'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        'glow-primary': '0 0 20px -3px rgba(37, 99, 235, 0.3)',
        'glow-success': '0 0 20px -3px rgba(16, 185, 129, 0.3)',
        'glow-warning': '0 0 20px -3px rgba(245, 158, 11, 0.3)',
      }
    },
  },
  plugins: [],
}
