/** @type {import("eslint").Linter.Config} */
module.exports = {
  root: true,
  extends: ["@peas/eslint-config/next.js"],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    project: "./tsconfig.json",
  },
  env: {
    node: true,
    es2021: true,
  },
};
