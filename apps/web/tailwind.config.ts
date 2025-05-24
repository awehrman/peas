import type { Config } from "tailwindcss";
import baseConfig from "@peas/tailwind";

const config: Config = {
  ...baseConfig,
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "../../packages/ui/src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    ...baseConfig.theme,
    extend: {
      // App-specific theme extensions
    },
  },
};

export default config;
