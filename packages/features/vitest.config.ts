/// <reference types="vitest" />
import path from "path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/test-utils/setup.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      // Without an include, Vitest only counts files that tests import, hiding untested components
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "src/test-utils/**",
        "src/**/__tests__/**",
        "**/*.d.ts",
        "**/*.test.{ts,tsx}",
        "**/*.spec.{ts,tsx}",
      ],
      // Ratchet: the floor of the last measured coverage (12 November 2026); raise it as coverage grows
      thresholds: {
        statements: 23,
        branches: 22,
        functions: 20,
        lines: 23,
      },
    },
    // Mock WebSocket and other browser APIs
    pool: "forks",
  },
  resolve: {
    alias: {
      // Components source imports its own "@/lib"; features has no src/lib to clash with
      "@/lib": path.resolve(__dirname, "../components/src/lib"),
      "@": path.resolve(__dirname, "./src"),
      "@peas/components": path.resolve(__dirname, "../components/src"),
      "@peas/theme": path.resolve(__dirname, "../theme/src"),
    },
  },
});
