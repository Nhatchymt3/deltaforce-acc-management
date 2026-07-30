/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        midnight: '#0C0F1A',
        gunmetal: '#1A1F2E',
        brass: '#C9A84C',
        'od-green': '#4A6741',
        'signal-red': '#B83A3A',
        ash: '#8B8FA3',
      },
      fontFamily: {
        display: ['var(--font-rajdhani)', 'sans-serif'],
        mono: ['var(--font-jetbrains)', 'monospace'],
      },
    },
  },
  plugins: [],
};
