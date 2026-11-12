import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/__tests__/**/*.test.ts"],
    exclude: ["legacy/**", "node_modules/**", "dist/**"],
    globalSetup: ["./scripts/vitest-global-setup.js"],
  },
});
