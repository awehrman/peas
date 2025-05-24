import { colors, spacing, typography, shadows } from "@peas/theme";
import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx}",
    "../../packages/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      colors,
      spacing,
      fontFamily: typography.fontFamily,
      fontSize: typography.fontSize,
      fontWeight: typography.fontWeight,
      boxShadow: shadows,
    },
  },
  plugins: [],
};

export default config;
