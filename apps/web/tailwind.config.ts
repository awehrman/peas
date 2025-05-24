import sharedConfig from "@peas/tailwind";
import type { Config } from "tailwindcss";

const config: Config = {
  ...sharedConfig,
  content: [
    ...(Array.isArray(sharedConfig.content) ? sharedConfig.content : []),
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "../../packages/ui/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    ...sharedConfig.theme,
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
  },
  plugins: [...(sharedConfig.plugins || []), require("tailwindcss-animate")],
};

export default config;
