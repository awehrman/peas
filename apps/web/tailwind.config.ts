import type { Config } from "tailwindcss";
import createConfig from "@peas/tailwind";

const config: Config = createConfig({
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "../../packages/ui/src/**/*.{js,ts,jsx,tsx}",
  ],
});

export default config;
