import config from "@peas/eslint-config";

export default [
  ...config,
  {
    ignores: [
      ".storybook/**",
      "vite.config.ts",
      "vitest.workspace.ts",
      "src/stories/**/*.stories.tsx",
      "src/vite-env.d.ts",
    ],
  },
];
