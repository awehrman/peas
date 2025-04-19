/** @type {import('tailwindcss').Config} */
const sharedConfig = require("./tailwind.config.ts");

/** @type {import('tailwindcss').Config} */
module.exports = {
  ...sharedConfig,
  content: [
    ...sharedConfig.content,
    "../../packages/ui/src/**/*.{js,ts,jsx,tsx}",
  ],
};
