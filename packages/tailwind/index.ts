import { colors, spacing, typography, shadows } from "@peas/theme";
import type { Config } from "tailwindcss";

const baseConfig: Config = {
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

export default function createConfig(config: Partial<Config>): Config {
  return {
    ...baseConfig,
    ...config,
  };
}
