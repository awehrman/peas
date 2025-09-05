import { tailwindTheme } from '../../theme/dist/tailwind.js';

/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      ...tailwindTheme.extend,
    },
  },
  plugins: [],
};
