/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        line: { DEFAULT: '#06C755', dark: '#05A847', light: '#E8F9EF' },
      },
      fontFamily: { sans: ['Noto Sans Thai', 'sans-serif'] },
    },
  },
  plugins: [],
};
