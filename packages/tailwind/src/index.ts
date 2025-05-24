import type { Config } from "tailwindcss";

export const baseConfig: Config = {
  content: [],
  theme: {
    extend: {
      colors: {
        // Your shared colors
      },
      // Other shared theme extensions
    },
  },
  plugins: [],
};

export const createConfig = (config: Partial<Config>): Config => ({
  ...baseConfig,
  ...config,
});
