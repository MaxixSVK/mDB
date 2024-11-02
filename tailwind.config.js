/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ["./web/**/*.{html,js}"],
  theme: {
    extend: {
      fontFamily: {
        figtree: ['Figtree', 'sans-serif'],
      },
    },
  },
  plugins: [],
}