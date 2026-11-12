import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/__tests__/**/*.test.ts"],
    exclude: ["legacy/**", "node_modules/**", "dist/**"],
    globalSetup: ["./scripts/vitest-global-setup.js"],
    coverage: {
      provider: "v8",
      reporter: ["text-summary", "html"],
      include: ["src/v2/**/*.ts"],
      exclude: ["src/**/__tests__/**", "src/v2/grammar/generated/**"],
      // Ratchet: the floor of the last measured coverage (12 November 2026); raise it as coverage grows
      thresholds: { statements: 96, branches: 89, functions: 97, lines: 98 },
    },
  },
});
