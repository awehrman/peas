import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx}",
    // Add any other packages that might use your UI components
    "../../apps/**/*.{js,ts,jsx,tsx}",
  ],
  presets: [require("@peas/tailwind")], // If you have a shared Tailwind preset
  theme: {
    extend: {
      colors: {
        red: {
          500: "#ef4444",
        },
      },
    },
  },
  plugins: [],
};

export default config;
