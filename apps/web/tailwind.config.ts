import { createConfig } from "@peas/tailwind";

export default createConfig({
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "../../packages/ui/src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // App-specific theme extensions
    },
  },
});
