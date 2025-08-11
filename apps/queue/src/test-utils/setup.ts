// Test setup file for Vitest
import fs from "fs/promises";
import path from "path";
import { afterAll, afterEach, beforeAll, vi } from "vitest";

import { QUEUE_DEFAULTS, SERVER_DEFAULTS } from "../config";

// ============================================================================
// TEST CLEANUP UTILITIES
// ============================================================================

/**
 * Clean up test files and directories
 */
export async function cleanupTestFiles(testPaths: string[]): Promise<void> {
  for (const testPath of testPaths) {
    try {
      const resolvedPath = path.resolve(testPath);
      const stats = await fs.stat(resolvedPath);

      if (stats.isDirectory()) {
        // Remove directory and all contents
        await fs.rm(resolvedPath, { recursive: true, force: true });
      } else {
        // Remove single file
        await fs.unlink(resolvedPath);
      }
    } catch (error) {
      // Ignore errors if file/directory doesn't exist
      if ((error as { code?: string }).code !== "ENOENT") {
        console.warn(`Failed to cleanup test path ${testPath}:`, error);
      }
    }
  }
}

/**
 * Clean up test upload directories
 */
export async function cleanupTestUploads(): Promise<void> {
  const uploadDirs = [
    path.join(process.cwd(), "uploads", "temp"),
    path.join(process.cwd(), "uploads", "processed"),
    path.join(process.cwd(), "uploads", "images"),
  ];

  for (const uploadDir of uploadDirs) {
    try {
      const contents = await fs.readdir(uploadDir);
      for (const item of contents) {
        const itemPath = path.join(uploadDir, item);
        const stats = await fs.stat(itemPath);

        if (stats.isDirectory()) {
          await fs.rm(itemPath, { recursive: true, force: true });
        } else {
          await fs.unlink(itemPath);
        }
      }
    } catch (error) {
      // Ignore errors if directory doesn't exist
      if ((error as { code?: string }).code !== "ENOENT") {
        console.warn(`Failed to cleanup upload directory ${uploadDir}:`, error);
      }
    }
  }
}

/**
 * Clean up test logs
 */
export async function cleanupTestLogs(): Promise<void> {
  const logDirs = [path.join(process.cwd(), "logs")];

  for (const logDir of logDirs) {
    try {
      const contents = await fs.readdir(logDir);
      for (const item of contents) {
        if (item.endsWith(".log") || item.endsWith(".tmp")) {
          const itemPath = path.join(logDir, item);
          await fs.unlink(itemPath);
        }
      }
    } catch (error) {
      // Ignore errors if directory doesn't exist
      if ((error as { code?: string }).code !== "ENOENT") {
        console.warn(`Failed to cleanup log directory ${logDir}:`, error);
      }
    }
  }
}

/**
 * Global test setup
 */
beforeAll(() => {
  // Set test environment
  process.env.NODE_ENV = "test";

  // Clear any existing mocks
  vi.clearAllMocks();
});

/**
 * Global test teardown
 */
afterAll(async () => {
  // Clean up any remaining test files
  await cleanupTestUploads();
  await cleanupTestLogs();

  // Restore all mocks
  vi.restoreAllMocks();
});

/**
 * Per-test cleanup
 */
afterEach(async () => {
  // Clear mocks after each test
  vi.clearAllMocks();

  // Clean up any test-specific files
  // This can be extended based on test needs
});

// ============================================================================
// TEST HELPERS
// ============================================================================

/**
 * Create a temporary test file
 */
export async function createTestFile(
  content: string,
  filename: string,
  directory?: string
): Promise<string> {
  const testDir = directory || path.join(process.cwd(), "uploads", "temp");
  await fs.mkdir(testDir, { recursive: true });

  const filePath = path.join(testDir, filename);
  await fs.writeFile(filePath, content);

  return filePath;
}

/**
 * Create a temporary test directory
 */
export async function createTestDirectory(
  dirname: string,
  parentDirectory?: string
): Promise<string> {
  const parentDir =
    parentDirectory || path.join(process.cwd(), "uploads", "temp");
  const testDir = path.join(parentDir, dirname);

  await fs.mkdir(testDir, { recursive: true });
  return testDir;
}

/**
 * Wait for a condition to be true
 */
export async function waitFor(
  condition: () => boolean | Promise<boolean>,
  timeout: number = 5000,
  interval: number = 100
): Promise<void> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    if (await condition()) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, interval));
  }

  throw new Error(`Condition not met within ${timeout}ms`);
}

/**
 * Mock console methods for testing
 */
export function mockConsole(): {
  log: ReturnType<typeof vi.fn>;
  error: ReturnType<typeof vi.fn>;
  warn: ReturnType<typeof vi.fn>;
  info: ReturnType<typeof vi.fn>;
  restore: () => void;
} {
  const log = vi.fn();
  const error = vi.fn();
  const warn = vi.fn();
  const info = vi.fn();

  vi.spyOn(console, "log").mockImplementation(log);
  vi.spyOn(console, "error").mockImplementation(error);
  vi.spyOn(console, "warn").mockImplementation(warn);
  vi.spyOn(console, "info").mockImplementation(info);

  return {
    log,
    error,
    warn,
    info,
    restore: () => {
      vi.restoreAllMocks();
    },
  };
}

// Suppress dotenv logs during testing
process.env.DOTENV_QUIET = "true";

// Mock environment variables for testing
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

// Export a function that can be called to verify setup
export function verifyTestSetup(): boolean {
  return process.env.NODE_ENV === "test";
}
