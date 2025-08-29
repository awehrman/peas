import config from "@peas/eslint-config";

export default [
  ...config,
  {
    ignores: ["dist/**", "**/*.test.ts", "**/*.test.tsx", "**/__tests__/**"],
  },
  {
    languageOptions: {
      globals: {
        performance: "readonly",
      },
    },
  },
];
