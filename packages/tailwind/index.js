const theme = require("@peas/theme");

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [`src/**/*.{js,ts,jsx,tsx}`, "../../packages/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: theme.colors,
      spacing: theme.spacing,
      fontFamily: theme.typography.fontFamily,
      fontSize: theme.typography.fontSize,
      fontWeight: theme.typography.fontWeight,
      // borderRadius: theme.borderRadius,
      boxShadow: theme.shadows,
      // keyframes: theme.animation.keyframes,
      // animation: theme.animation.animation,
    },
  },
  plugins: [],
};
