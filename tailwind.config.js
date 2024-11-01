/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ["./web2/**/*.{html,js}"],
  theme: {
    extend: {
      fontFamily: {
        figtree: ['Figtree', 'sans-serif'],
      },
    },
  },
  plugins: [],
}