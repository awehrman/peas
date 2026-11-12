import { resolve } from "path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    setupFiles: ["./src/test-utils/setup.ts"],
    include: ["src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
    exclude: ["node_modules", "dist", ".idea", ".git", ".cache"],
    coverage: {
      provider: "istanbul",
      reporter: ["text", "json", "html"],
      // Application source only: tests and test helpers would inflate the numbers
      include: ["src/**/*.ts"],
      exclude: [
        "src/**/__tests__/**",
        "src/test-utils/**",
        "**/*.d.ts",
        "**/*.config.*",
      ],
      // Ratchet: the floor of the last measured coverage (12 November 2026); raise it as coverage grows
      thresholds: {
        statements: 96,
        branches: 95,
        functions: 96,
        lines: 96,
      },
    },
    // Suppress console output from dotenv
    silent: false,
    onConsoleLog(log, _type) {
      if (log.includes("dotenv@")) {
        return false; // Suppress dotenv logs
      }
      return true; // Allow other logs
    },
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    },
  },
});
