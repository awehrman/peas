import { tailwindTheme } from "../../theme/src/tailwind.js";

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
