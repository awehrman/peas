import config from "@peas/eslint-config";

export default [
  ...config,
  {
    ignores: [
      ".storybook/**",
      "storybook-static/**",
      "vite.config.ts",
      "vitest.workspace.ts",
      "src/stories/**/*.stories.tsx",
      "src/stories/**/index.ts",
      "src/vite-env.d.ts",
    ],
  },
];
