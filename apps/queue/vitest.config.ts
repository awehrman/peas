import { defineConfig } from "vitest/config";
import { resolve } from "path";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    setupFiles: ["./src/test-setup.ts"],
    include: ["src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
    exclude: ["node_modules", "dist", ".idea", ".git", ".cache"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      all: true,
      include: [
        "src/services/**/*.ts",
        "src/utils/**/*.ts",
        "src/workers/**/*.ts",
        "src/parsers/**/*.ts",
        "src/**/__tests__/**/*.ts",
      ],
      exclude: [
        "node_modules/",
        "dist/",
        "src/test-setup.ts",
        "src/tests/**",
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
