import { createConfig } from "@peas/tailwind";

export default createConfig({
  content: [
    "./src/**/*.{js,ts,jsx,tsx}",
    // Add any other packages that might use your UI components
    "../../apps/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        red: {
          500: "#ef4444",
        },
      },
    },
  },
});
