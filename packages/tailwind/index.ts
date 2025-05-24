import { colors, spacing, typography, shadows } from "@peas/theme";
import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    // Apps
    "../../apps/web/app/**/*.{js,ts,jsx,tsx,mdx}",
    "../../apps/web/components/**/*.{js,ts,jsx,tsx,mdx}",
    "../../apps/docs/app/**/*.{js,ts,jsx,tsx,mdx}",
    // Packages
    "../../packages/ui/src/**/*.{js,ts,jsx,tsx,mdx}",
    "../../packages/theme/src/**/*.{js,ts,jsx,tsx,mdx}",
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
