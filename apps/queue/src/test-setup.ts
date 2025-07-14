// Test setup file for Vitest
import { beforeAll, afterAll } from "vitest";

// Mock environment variables for testing
process.env.NODE_ENV = "test";
process.env.PORT = "4200";
process.env.WS_PORT = "8080";
process.env.BATCH_SIZE = "10";
process.env.MAX_RETRIES = "3";
process.env.BACKOFF_MS = "1000";
process.env.MAX_BACKOFF_MS = "30000";

// Global test setup
beforeAll(() => {
  // Any global setup before tests
  console.log("🧪 Setting up test environment...");
});

// Global test cleanup
afterAll(() => {
  // Any global cleanup after tests
  console.log("🧹 Cleaning up test environment...");
});
