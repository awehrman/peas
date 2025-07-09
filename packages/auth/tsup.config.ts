import { defineConfig } from "tsup";

export default defineConfig([
  {
    entry: ["src/index.ts"],
    format: ["esm"],
    dts: true,
    splitting: false,
    sourcemap: true,
    clean: true,
    external: ["lucia", "@lucia-auth/adapter-prisma", "next", "next/headers"],
    noExternal: ["@peas/database"],
  },
  {
    entry: ["src/next.ts"],
    format: ["esm"],
    dts: false,
    splitting: false,
    sourcemap: true,
    external: ["next/headers"],
    outDir: "dist",
  },
]);
