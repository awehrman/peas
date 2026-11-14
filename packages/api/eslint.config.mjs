import config from "@peas/eslint-config";

export default [
  ...config,
  {
    ignores: ["src/generated/**"],
  },
  {
    files: ["**/*.ts"],
    rules: {
      // TypeScript checks undefined names, including Fetch API globals (Request, Response, ReadableStream)
      "no-undef": "off",
    },
  },
];
