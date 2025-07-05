import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  dts: true,
  external: ["react", "react-dom"],
  splitting: false,
  treeshake: true,
  esbuildOptions(options) {
    options.alias = {
      "@": "./src",
    };
  },
  outDir: "dist",
  clean: true,
});
