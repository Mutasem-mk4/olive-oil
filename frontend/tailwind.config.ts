/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        olive: {
          50:  '#f0faf5',
          100: '#d6f3e6',
          200: '#aee7ce',
          300: '#76d3af',
          400: '#3fb88a',
          500: '#1D9E75',
          600: '#158060',
          700: '#13654d',
          800: '#12503f',
          900: '#0f4234',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        card: '12px',
      },
    },
  },
  plugins: [],
}
