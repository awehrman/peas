import sharedConfig from "@peas/tailwind";
import type { Config } from "tailwindcss";

const config: Config = {
  ...sharedConfig,
  content: [
    ...(Array.isArray(sharedConfig.content) ? sharedConfig.content : []),
    "./src/**/*.{js,ts,jsx,tsx}",
    "./.storybook/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    ...sharedConfig.theme,
  },
  plugins: [...(sharedConfig.plugins || [])],
};

export default config;
