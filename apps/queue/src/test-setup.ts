// Test setup file for Vitest
import { beforeAll, afterAll, vi } from "vitest";
import { SERVER_DEFAULTS, QUEUE_DEFAULTS } from "./config";

// Suppress dotenv logs during testing
process.env.DOTENV_QUIET = "true";

// Mock environment variables for testing
process.env.NODE_ENV = "test";
process.env.PORT = SERVER_DEFAULTS.PORT.toString();
process.env.WS_PORT = SERVER_DEFAULTS.WS_PORT.toString();
process.env.BATCH_SIZE = QUEUE_DEFAULTS.BATCH_SIZE.toString();
process.env.MAX_RETRIES = QUEUE_DEFAULTS.MAX_RETRIES.toString();
process.env.BACKOFF_MS = QUEUE_DEFAULTS.BACKOFF_MS.toString();
process.env.MAX_BACKOFF_MS = QUEUE_DEFAULTS.MAX_BACKOFF_MS.toString();

// Mock Redis connection for testing
vi.mock("./config/redis", () => ({
  redisConnection: {
    host: "localhost",
    port: 6379,
  },
}));

// Mock BullMQ for testing
vi.mock("bullmq", () => ({
  Queue: vi.fn().mockImplementation(() => ({
    add: vi.fn().mockResolvedValue({ id: "test-job-id" }),
    close: vi.fn().mockResolvedValue(undefined),
  })),
  Worker: vi.fn().mockImplementation(() => ({
    close: vi.fn().mockResolvedValue(undefined),
  })),
}));

// Mock createQueue globally for all tests
vi.mock("apps/queue/src/queues/createQueue", () => ({
  createQueue: vi.fn((name) => ({
    get name() {
      return name;
    },
  })),
}));
// Also mock for tests that import from ../queues/createQueue
vi.mock("../queues/createQueue", () => ({
  createQueue: vi.fn((name) => ({
    get name() {
      return name;
    },
  })),
}));

// Global test setup
beforeAll(() => {
  // Any global setup before tests
  // console.log("🧪 Setting up test environment...");
});

// Global test teardown
afterAll(() => {
  // Any global cleanup after tests
  // console.log("🧹 Cleaning up test environment...");
});
