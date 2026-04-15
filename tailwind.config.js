/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Nunito', 'sans-serif'],
        serif: ['Lora', 'serif'],
      },
      colors: {
        amber: {
          50: '#FAEEDA',
          100: '#FAC775',
          200: '#EF9F27',
          600: '#BA7517',
          700: '#854F0B',
          800: '#633806',
        },
      },
    },
  },
  plugins: [],
}
