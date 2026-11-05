/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f3f0ff',
          100: '#eae4ff',
          200: '#d7ccff',
          300: '#bca7f6',
          400: '#9a7eea',
          500: '#8062dd',
          600: '#6c57db',
          700: '#5943bf',
          800: '#49389a',
          900: '#3e327b',
        },
        navy: {
          50: '#f2f5fa',
          100: '#e6ebf3',
          200: '#cbd5e4',
          500: '#52617a',
          700: '#263650',
          800: '#18263e',
          900: '#111e35',
          950: '#0b1426',
        },
      },
      fontFamily: {
        sans: [
          'Inter',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'sans-serif',
        ],
      },
      boxShadow: { soft: '0 6px 30px -10px rgba(23, 31, 66, .12)', card: '0 2px 6px rgba(17, 30, 53, .025)' },
    },
  },
  plugins: [],
};
