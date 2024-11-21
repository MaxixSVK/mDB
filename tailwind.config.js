/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ["./web/**/*.{html,js}"],
  theme: {
    extend: {
      fontFamily: {
        figtree: ['Figtree', 'sans-serif'],
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeOut: {
          '0%': { opacity: '1' },
          '100%': { opacity: '0' },
        },
      },
      animation: {
        fadeIn: 'fadeIn 0.5s ease-in-out',
        fadeOut: 'fadeOut 0.5s ease-in-out',
      },
    },
  },
  plugins: [
    require('tailwind-scrollbar'),
  ],
}