import type { Config } from "tailwindcss";
import baseConfig from "@peas/tailwind";

const config: Config = {
  ...baseConfig,
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
          50: "hsl(var(--primary) / 0.05)",
          100: "hsl(var(--primary) / 0.1)",
          200: "hsl(var(--primary) / 0.2)",
          300: "hsl(var(--primary) / 0.3)",
          400: "hsl(var(--primary) / 0.4)",
          500: "hsl(var(--primary) / 0.5)",
          600: "hsl(var(--primary) / 0.6)",
          700: "hsl(var(--primary) / 0.7)",
          800: "hsl(var(--primary) / 0.8)",
          900: "hsl(var(--primary) / 0.9)",
          950: "hsl(var(--primary) / 0.95)",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
          50: "hsl(var(--secondary) / 0.05)",
          100: "hsl(var(--secondary) / 0.1)",
          200: "hsl(var(--secondary) / 0.2)",
          300: "hsl(var(--secondary) / 0.3)",
          400: "hsl(var(--secondary) / 0.4)",
          500: "hsl(var(--secondary) / 0.5)",
          600: "hsl(var(--secondary) / 0.6)",
          700: "hsl(var(--secondary) / 0.7)",
          800: "hsl(var(--secondary) / 0.8)",
          900: "hsl(var(--secondary) / 0.9)",
          950: "hsl(var(--secondary) / 0.95)",
        },
      },
    },
  },
};

export default config;
