import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    include: ["src/**/__tests__/**/*.test.{ts,tsx}"],
    coverage: {
      provider: "v8",
      reporter: ["text-summary", "html"],
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "src/**/__tests__/**",
        "src/routeTree.gen.ts",
        "src/graphql/generated.ts",
        "src/graphql/possible-types.ts",
      ],
      // Unit coverage only: routes and components are exercised by the Playwright suites instead.
      // Ratchet: the floor of the last measured coverage (12 November 2026); raise it as coverage grows
      thresholds: { statements: 21, branches: 24, functions: 15, lines: 21 },
    },
  },
});
