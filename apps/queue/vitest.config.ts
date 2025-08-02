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
      all: true,
      include: [
        "src/config/**/*.ts",
        "src/middleware/**/*.ts",
        "src/monitoring/**/*.ts",
        "src/parsers/**/*.ts",
        "src/queues/**/*.ts",
        "src/routes/**/*.ts",
        "src/schemas/**/*.ts",
        "src/services/**/*.ts",
        "src/test-utils/**/*.ts",
        "src/utils/**/*.ts",
        "src/workers/**/*.ts",
        "src/**/__tests__/**/*.ts",
      ],
      exclude: [
        "node_modules/",
        "dist/",
        "**/*.d.ts",
        "**/*.config.*",
        "**/coverage/**",
      ],
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
