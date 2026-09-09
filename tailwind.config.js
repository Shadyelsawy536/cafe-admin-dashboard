/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        canvas: '#F7F7F5',
        surface: '#FFFFFF',
        ink: '#1C1B1A',
        line: '#E4E2DE',
        accent: '#1F5F5B',
        'accent-dark': '#164846',
        danger: '#C53030',
        'status-pending': '#B7791F',
        'status-ready': '#2F855A',
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'sans-serif'],
        sans: ['Inter', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
};
