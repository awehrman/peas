import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/__tests__/**/*.test.ts"],
    exclude: [
      "src/**/__tests__/**/*.int.test.ts",
      "node_modules/**",
      "dist/**",
    ],
  },
});
