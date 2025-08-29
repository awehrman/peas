import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "index.ts",
    "errors/index": "errors/index.ts",
    "monitoring/index": "monitoring/index.ts",
    "types/index": "types/index.ts",
    "utils/index": "utils/index.ts",
  },
  format: ["cjs", "esm"],
  dts: {
    respectExternal: true,
  },
  splitting: false,
  sourcemap: true,
  clean: true,
  external: ["react"],
  treeshake: false,
  minify: false,
  jsx: "react-jsx",
  jsxImportSource: "react",
});
