import config from "@peas/eslint-config";

export default [
  ...config,
  {
    ignores: ["dist/**"],
  },
];
