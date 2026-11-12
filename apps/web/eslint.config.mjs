import config from "@peas/eslint-config";
import reactHooks from "eslint-plugin-react-hooks";

export default [
  ...config,
  {
    ignores: [
      "src/routeTree.gen.ts",
      "src/graphql/generated.ts",
      "src/graphql/possible-types.ts",
      ".output/**",
      ".nitro/**",
      ".tanstack/**",
      "test-results/**",
      "playwright-report/**",
    ],
  },
  {
    files: ["**/*.ts", "**/*.tsx"],
    plugins: { "react-hooks": reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,
      // TypeScript checks undefined names, including browser and Fetch API globals
      "no-undef": "off",
    },
  },
];
