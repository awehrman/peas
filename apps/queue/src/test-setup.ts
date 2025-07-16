// Test setup file for Vitest
import { beforeAll, afterAll } from "vitest";
import { SERVER_DEFAULTS, QUEUE_DEFAULTS } from "./config";

// Mock environment variables for testing
process.env.NODE_ENV = "test";
process.env.PORT = SERVER_DEFAULTS.PORT.toString();
process.env.WS_PORT = SERVER_DEFAULTS.WS_PORT.toString();
process.env.BATCH_SIZE = QUEUE_DEFAULTS.BATCH_SIZE.toString();
process.env.MAX_RETRIES = QUEUE_DEFAULTS.MAX_RETRIES.toString();
process.env.BACKOFF_MS = QUEUE_DEFAULTS.BACKOFF_MS.toString();
process.env.MAX_BACKOFF_MS = QUEUE_DEFAULTS.MAX_BACKOFF_MS.toString();

// Global test setup
beforeAll(() => {
  // Any global setup before tests
  console.log("🧪 Setting up test environment...");
});

// Global test teardown
afterAll(() => {
  // Any global cleanup after tests
  console.log("🧹 Cleaning up test environment...");
});
