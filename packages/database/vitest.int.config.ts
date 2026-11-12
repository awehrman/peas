import { defineConfig } from "vitest/config";

/**
 * Unit and integration tests against a real Postgres database named by TEST_DATABASE_URL. The global setup wipes and migrates that database first, so it must be a throwaway (its name must contain "test"). Without TEST_DATABASE_URL the integration suites are skipped.
 *
 *   TEST_DATABASE_URL=postgresql://<you>@localhost:5432/peas_test yarn workspace @peas/database test:int
 *   TEST_DATABASE_URL=... yarn workspace @peas/database test:coverage
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
      exclude: ["src/**/__tests__/**"],
      // The legacy repositories are exercised through @peas/api's integration tests rather than here.
      // Ratchet: the floor of the last measured coverage (12 November 2026); raise it as coverage grows
      thresholds: { statements: 58, branches: 53, functions: 50, lines: 59 },
    },
  },
});
