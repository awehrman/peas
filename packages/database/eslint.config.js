import js from "@eslint/js";
import { FlatCompat } from "@eslint/eslintrc";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

export default [
  js.configs.recommended,
  ...compat.extends("@peas/eslint-config-typescript-config/base.json"),
  {
    ignores: [
      "schema.prisma", // Exclude the generated schema file
      "prisma/migrations/**", // Exclude migration files
      "dist/**",
      "node_modules/**",
    ],
  },
  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      parserOptions: {
        project: "./tsconfig.json",
      },
    },
  },
];
