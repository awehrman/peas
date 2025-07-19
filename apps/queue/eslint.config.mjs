import js from "@eslint/js";
import tseslint from "@typescript-eslint/eslint-plugin";
import tsparser from "@typescript-eslint/parser";
import prettier from "eslint-config-prettier";

export default [
  // Base JavaScript recommended rules
  js.configs.recommended,

  // Ignore large parser files and dist folders
  {
    ignores: [
      "**/packages/parser/**",
      "**/node_modules/@peas/parser/**",
      "**/dist/**",
      "**/*.peggy",
      "**/*.pegjs",
    ],
  },

  // TypeScript configuration (simplified to avoid stack overflow)
  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        // Remove project reference to avoid type checking that causes stack overflow
        // project: "./tsconfig.json",
      },
    },
    plugins: {
      "@typescript-eslint": tseslint,
    },
    rules: {
      ...tseslint.configs.recommended.rules,
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-var-requires": "warn",
      "@typescript-eslint/no-require-imports": "warn",
      "prefer-const": "error",
    },
  },

  // Node.js specific rules
  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      globals: {
        console: "readonly",
        process: "readonly",
        Buffer: "readonly",
        __dirname: "readonly",
        __filename: "readonly",
        global: "readonly",
        module: "readonly",
        require: "readonly",
        exports: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        setInterval: "readonly",
        clearInterval: "readonly",
        crypto: "readonly",
      },
    },
    rules: {
      "no-console": "off",
      "no-process-exit": "warn",
    },
  },

  // Prettier config (must be last)
  prettier,
];
