/** @type {import('tailwindcss').Config} */

// Every brand color reads from a CSS variable (space-separated RGB channels)
// so Tailwind's opacity utilities (bg-accent/10, text-ink/60 ...) keep working
// AND the colors can be changed at runtime from Settings -> Admin Dashboard
// without a rebuild. Defaults live in src/index.css; src/lib/theme.ts applies
// the restaurant's saved colors on top.
const v = (name) => `rgb(var(${name}) / <alpha-value>)`;

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        canvas: v('--c-canvas'),
        surface: v('--c-surface'),
        ink: v('--c-ink'),
        line: v('--c-line'),
        accent: v('--c-primary'),
        'accent-dark': v('--c-primary-dark'),
        'on-accent': v('--c-on-primary'),
        secondary: v('--c-secondary'),
        'secondary-deep': v('--c-secondary-deep'),
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
