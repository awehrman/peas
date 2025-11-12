import config from "@peas/eslint-config";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default [
  ...config,
  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      parserOptions: {
        project: [path.resolve(__dirname, "tsconfig.json")],
        tsconfigRootDir: __dirname,
      },
    },
  },
];
