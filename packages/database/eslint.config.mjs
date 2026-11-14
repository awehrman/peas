import config from "@peas/eslint-config";

export default [
  ...config,
  {
    files: ["**/*.ts"],
    languageOptions: {
      parserOptions: {
        // tsconfig.json excludes tests from the build; this one includes them
        project: "./tsconfig.test.json",
      },
    },
  },
];
