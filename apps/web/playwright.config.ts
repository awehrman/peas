import { defineConfig, devices } from "@playwright/test";

const E2E_PORT = 3110;
const testDatabaseUrl = process.env.TEST_DATABASE_URL ?? "";

/**
 * End-to-end tests run against their own dev server (port 3110) backed by TEST_DATABASE_URL, which the global setup migrates and seeds. WebKit runs too, because Apollo's TanStack Start integration has had Safari-only hydration bugs.
 *
 *   TEST_DATABASE_URL=postgresql://<you>@localhost:5432/peas_test yarn workspace @peas/web test:e2e
 */
export default defineConfig({
  testDir: "./tests",
  testMatch: "**/*.spec.ts",
  globalSetup: "./tests/support/global-setup.ts",
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI
    ? [["github"], ["html", { open: "never" }]]
    : [["list"]],
  use: {
    baseURL: `http://localhost:${E2E_PORT}`,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
  ],
  webServer: {
    command: `npx vite dev --port ${E2E_PORT} --strictPort`,
    url: `http://localhost:${E2E_PORT}/login`,
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      DATABASE_URL: testDatabaseUrl,
      PORT: String(E2E_PORT),
      SIGN_UP_CODES: "e2e-invite",
    },
  },
});
