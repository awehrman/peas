import { defineConfig } from "vitest/config";

/**
 * Unit tests plus integration tests that run resolvers and auth flows against a real Postgres database named by TEST_DATABASE_URL (its name must contain "test"). Without TEST_DATABASE_URL the integration suites are skipped.
 *
 *   TEST_DATABASE_URL=postgresql://<you>@localhost:5432/peas_test yarn workspace @peas/api test:int
 *   TEST_DATABASE_URL=... yarn workspace @peas/api test:coverage
 */
export default defineConfig({
  test: {
    include: ["src/**/__tests__/**/*.test.ts"],
    globalSetup: ["./scripts/vitest-int-global-setup.ts"],
    setupFiles: ["./scripts/vitest-int-setup.ts"],
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 120_000,
    coverage: {
      provider: "v8",
      reporter: ["text-summary", "html"],
      include: ["src/**/*.ts"],
      exclude: ["src/**/__tests__/**", "src/generated/**"],
      // Ratchet: the floor of the last measured coverage with TEST_DATABASE_URL (12 November 2026); raise it as coverage grows
      thresholds: { statements: 90, branches: 80, functions: 94, lines: 91 },
    },
  },
});
