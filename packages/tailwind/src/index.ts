import type { Config } from "tailwindcss";
import { colors, spacing, typography, shadows } from "@peas/theme";

const baseConfig: Config = {
  content: [],
  theme: {
    extend: {
      colors: {
        background: colors.background,
        foreground: colors.foreground,
        primary: colors.primary,
        secondary: colors.secondary,
        destructive: colors.destructive,
        muted: colors.muted,
        accent: colors.accent,
        popover: colors.popover,
        card: colors.card,
        border: colors.border,
        input: colors.input,
        ring: colors.ring,
      },
      spacing,
      fontFamily: typography.fontFamily,
      fontSize: typography.fontSize,
      fontWeight: typography.fontWeight,
      boxShadow: shadows,
    },
  },
  plugins: [],
};

export function createConfig(config: Partial<Config>): Config {
  return {
    ...baseConfig,
    ...config,
  };
}

export default createConfig;
