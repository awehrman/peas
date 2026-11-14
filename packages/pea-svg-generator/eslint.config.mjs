import config from "@peas/eslint-config";

export default [
  ...config,
  {
    ignores: ["dist/**", "compiled/**"],
  },
  {
    files: ["scripts/**/*.ts"],
    languageOptions: {
      parserOptions: { project: "./tsconfig.scripts.json" },
    },
  },
  {
    files: ["**/*.mjs"],
    languageOptions: {
      globals: {
        console: "readonly",
        process: "readonly",
      },
    },
  },
];
