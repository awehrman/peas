import { FlatCompat } from "@eslint/eslintrc";
import baseConfig from "@peas/eslint-config";

const compat = new FlatCompat({
  baseDirectory: import.meta.dirname,
});

const nextConfigs = compat.extends("next/core-web-vitals").map((entry) => ({
  ...entry,
  settings: {
    ...(entry.settings ?? {}),
    next: {
      ...(entry.settings?.next ?? {}),
      rootDir: ["apps/web/"],
    },
  },
}));

export default [
  ...nextConfigs,
  ...baseConfig,
  {
    files: ["**/*.{ts,tsx,js,jsx}"],
    rules: {
      "@next/next/no-html-link-for-pages": ["error", "./src/app"],
    },
  },
];
