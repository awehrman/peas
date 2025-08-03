import type { Queue, Worker } from "bullmq";
import express from "express";
// ============================================================================
// EXPRESS TEST UTILITIES
// ============================================================================

import type { NextFunction, Request, Response } from "express";
import { expect, vi } from "vitest";

import type { NotePipelineData } from "../types/notes";
import type { ActionContext } from "../workers/core/types";

// ============================================================================
// ENVIRONMENT TEST UTILITIES
// ============================================================================

/**
 * Create a test environment manager for handling process.env changes
 */
export function createTestEnvironment() {
  const originalEnv: Record<string, string | undefined> = { ...process.env };

  /* istanbul ignore next -- @preserve */
  return {
    /**
     * Set environment variables for testing
     */
    setEnv: (envVars: Record<string, string | undefined>) => {
      Object.assign(process.env, envVars);
    },

    /**
     * Restore original environment variables
     */
    restore: () => {
      process.env = { ...originalEnv };
    },

    /**
     * Get the original environment backup
     */
    getOriginalEnv: () => ({ ...originalEnv }),
  };
}

// ============================================================================
// CONSOLE SPY UTILITIES
// ============================================================================

/**
 * Create console spies for testing console output
 */
export function createConsoleSpies() {
  const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
  const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
  const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});

  return {
    logSpy,
    warnSpy,
    errorSpy,
    infoSpy,
    /**
     * Restore all console spies
     */
    restore: () => {
      logSpy.mockRestore();
      warnSpy.mockRestore();
      errorSpy.mockRestore();
      infoSpy.mockRestore();
    },
  };
}

// ============================================================================
// MOCK UTILITIES
// ============================================================================

/**
 * Create a mock Redis client for testing
 */
export function createMockRedisClient() {
  return {
    on: vi.fn(),
    connect: vi.fn().mockResolvedValue(undefined),
    get: vi.fn(),
    set: vi.fn(),
    del: vi.fn(),
    exists: vi.fn(),
    mGet: vi.fn(),
    multi: vi.fn(),
    keys: vi.fn(),
    quit: vi.fn(),
    scan: vi.fn(),
    sMembers: vi.fn(),
    sAdd: vi.fn(),
    flushDb: vi.fn(),
    info: vi.fn(),
    dbSize: vi.fn(),
  };
}

/**
 * Create a mock Prisma client for testing
 */
export function createMockPrismaClient() {
  return {
    $queryRaw: vi.fn(),
    $executeRaw: vi.fn(),
    $disconnect: vi.fn(),
  };
}

// TEST UTILITIES

/**
 * Queue options type for testing
 */
export interface QueueOptions {
  connection: {
    host?: string;
    port?: number;
    username?: string;
    password?: string;
  };
  [key: string]: unknown;
}

/**
 * Create a mock Queue instance for testing
 */
export function createMockQueue(
  name: string = "test-queue",
  options?: QueueOptions
): Queue {
  return {
    name,
    options,
    add: vi.fn().mockResolvedValue({ id: "test-job-id" }),
    close: vi.fn().mockResolvedValue(undefined),
    getJob: vi.fn().mockResolvedValue(null),
    getJobs: vi.fn().mockResolvedValue([]),
    getJobCounts: vi.fn().mockResolvedValue({
      waiting: 0,
      active: 0,
      completed: 0,
      failed: 0,
      delayed: 0,
      paused: 0,
    }),
    getWaiting: vi.fn().mockResolvedValue([]),
    getActive: vi.fn().mockResolvedValue([]),
    getCompleted: vi.fn().mockResolvedValue([]),
    getFailed: vi.fn().mockResolvedValue([]),
  } as unknown as Queue;
}

/**
 * Create a mock Worker instance for testing
 */
export function createMockWorker(): Worker {
  return {
    close: vi.fn().mockResolvedValue(undefined),
    on: vi.fn(),
    off: vi.fn(),
  } as unknown as Worker;
}

/**
 * Create mock NotePipelineData for testing
 */
export function createMockNoteData(
  overrides: Partial<NotePipelineData> = {}
): NotePipelineData {
  return {
    content: "<html><body><h1>Test Recipe</h1><p>1 cup flour</p></body></html>",
    importId: "test-import-id",
    source: {
      filename: "test-recipe.html",
      url: "https://example.com/recipe",
    },
    options: {},
    ...overrides,
  };
}

/**
 * Create mock ActionContext for testing
 */
export function createMockActionContext(
  overrides: Partial<ActionContext> = {}
): ActionContext {
  return {
    jobId: "test-job-id",
    retryCount: 0,
    queueName: "test-queue",
    operation: "test-operation",
    startTime: Date.now(),
    workerName: "test-worker",
    attemptNumber: 1,
    ...overrides,
  };
}

/**
 * Create a mock logger for testing
 */
export function createMockLogger() {
  return {
    log: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    fatal: vi.fn(),
  };
}

/**
 * Create a mock status broadcaster for testing
 */
export function createMockStatusBroadcaster() {
  return {
    addStatusEventAndBroadcast: vi.fn().mockResolvedValue(undefined),
    broadcast: vi.fn().mockResolvedValue(undefined),
  };
}

/**
 * Create a mock service container for testing
 */
export function createMockServiceContainer() {
  return {
    logger: createMockLogger(),
    cache: {
      get: vi.fn(),
      set: vi.fn(),
      delete: vi.fn(),
    },
    database: {
      note: {
        create: vi.fn(),
        findById: vi.fn(),
        update: vi.fn(),
      },
    },
    _workers: {},
  };
}

/**
 * Wait for a specified number of milliseconds
 */
export function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Wait for all pending promises to resolve
 */
export function flushPromises(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

/**
 * Create a mock Redis connection for testing
 */
export function createMockRedisConnection() {
  return {
    get: vi.fn(),
    set: vi.fn(),
    del: vi.fn(),
    exists: vi.fn(),
    mget: vi.fn(),
    mset: vi.fn(),
    keys: vi.fn(),
    quit: vi.fn(),
    scan: vi.fn(),
  };
}

/**
 * Create mock HTML content for testing
 */
/* istanbul ignore next -- @preserve */
export function createMockHtmlContent(title: string = "Test Recipe"): string {
  return `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body>
        <en-note class="peso" style="white-space: inherit">
          <meta itemprop="title" content="${title}" />
          <meta itemprop="created" content="20230101T000000Z" />
          <h1 class="noteTitle html-note">
            <b>${title}</b>
          </h1>
          <div class="para">1 cup flour</div>
          <div class="para">2 eggs</div>
          <div class="para">Mix ingredients together</div>
        </en-note>
      </body>
    </html>
  `;
}

/**
 * Assert that a function was called with specific arguments
 */
export function expectCalledWith<T extends (...args: unknown[]) => unknown>(
  mock: T,
  expectedArgs: Parameters<T>
): void {
  expect(mock).toHaveBeenCalledWith(...expectedArgs);
}

/**
 * Assert that a function was called exactly once
 */
export function expectCalledOnce<T extends (...args: unknown[]) => unknown>(
  mock: T
): void {
  expect(mock).toHaveBeenCalledTimes(1);
}

/**
 * Assert that a function was never called
 */
export function expectNeverCalled<T extends (...args: unknown[]) => unknown>(
  mock: T
): void {
  expect(mock).not.toHaveBeenCalled();
}

/**
 * Create a test environment with common mocks
 */
export function setupTestEnvironment() {
  // Mock environment variables
  process.env.NODE_ENV = "test";
  process.env.PORT = "3000";
  process.env.WS_PORT = "8080";

  // Mock console methods to reduce noise in tests
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});

  return {
    cleanup: () => {
      vi.restoreAllMocks();
    },
  };
}

// ============================================================================

// ============================================================================

/**
 * Create a mock Express Request for testing
 */
export function createMockRequest(overrides: Partial<Request> = {}): Request {
  return {
    ip: "127.0.0.1",
    params: {},
    query: {},
    body: {},
    headers: {},
    method: "GET",
    file: undefined,
    ...overrides,
  } as Request;
}

/**
 * Create a mock Express Response for testing
 */
export function createMockResponse(): Response {
  const res = {
    status: vi.fn(),
    json: vi.fn(),
    set: vi.fn(),
    end: vi.fn(),
  } as unknown as Response;

  // Chain the methods properly
  (res.status as ReturnType<typeof vi.fn>).mockReturnValue(res);
  (res.json as ReturnType<typeof vi.fn>).mockReturnValue(res);
  (res.set as ReturnType<typeof vi.fn>).mockReturnValue(res);
  (res.end as ReturnType<typeof vi.fn>).mockReturnValue(res);

  return res;
}

/**
 * Create a mock Express NextFunction for testing
 */
export function createMockNext(): NextFunction {
  return vi.fn();
}

/**
 * Create a mock file upload for testing
 */
export function createMockFile(overrides: Partial<MulterFile> = {}) {
  return {
    fieldname: "file",
    originalname: "test.html",
    encoding: "7bit",
    mimetype: "text/html",
    size: 1024,
    destination: undefined,
    filename: undefined,
    path: undefined,
    buffer: undefined,
    ...overrides,
  } as MulterFile;
}

// Type for Multer file (matching the validation.ts definition)
type MulterFile = {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  destination?: string;
  filename?: string;
  path?: string;
  buffer?: Buffer;
};

/**
 * Test data fixtures
 */
export const TEST_FIXTURES = {
  validHtml: createMockHtmlContent("Valid Recipe"),
  invalidHtml: "<invalid>html",
  emptyHtml: "",
  largeHtml: createMockHtmlContent("Large Recipe") + "x".repeat(10000),
  htmlWithStyles: `
    <html>
      <head>
        <style>
          body { color: red; }
        </style>
      </head>
      <body>
        <en-note>
          <h1>Styled Recipe</h1>
          <p>Content</p>
        </en-note>
      </body>
    </html>
  `,
  htmlWithIcons: `
    <html>
      <body>
        <en-note>
          <icons>
            <svg>...</svg>
          </icons>
          <h1>Recipe with Icons</h1>
          <p>Content</p>
        </en-note>
      </body>
    </html>
  `,
};

// ============================================================================
// COMMON MOCK SETUPS
// ============================================================================

/**
 * Mock Redis configuration for testing
 */
export const MOCK_REDIS_CONFIG = {
  host: "localhost",
  port: 6379,
  username: "test-user",
  password: "test-password",
};

// ============================================================================
// EXPRESS TEST UTILITIES
// ============================================================================

/**
 * Create a test Express application with common middleware
 */
export function createTestApp() {
  const app = express();
  app.use(express.json());
  return app;
}

/**
 * Create mock cache manager for testing
 */
export function createMockCacheManager() {
  return {
    ...createMockRedisClient(),
    getHitRate: vi.fn().mockReturnValue(85.5),
    getStats: vi.fn().mockReturnValue({
      hits: 100,
      misses: 20,
      keys: 50,
      lastReset: new Date().toISOString(),
    }),
    isReady: vi.fn().mockReturnValue(true),
  };
}

/**
 * Create mock health monitor for testing
 */
export function createMockHealthMonitor() {
  return {
    isHealthy: vi.fn().mockResolvedValue(true),
    getComponentHealth: vi.fn().mockResolvedValue({
      status: "healthy",
      details: "Component is operational",
      metrics: {},
    }),
  };
}

/**
 * Create mock action cache stats for testing
 */
export function createMockActionCacheStats(
  overrides: Partial<{
    memorySize: number;
    memoryKeys: string[];
  }> = {}
) {
  return {
    memorySize: 1024,
    memoryKeys: ["key1", "key2", "key3", "key4", "key5"],
    ...overrides,
  };
}

/**
 * Create mock Redis stats for testing
 */
export function createMockRedisStats(
  overrides: Partial<{
    hits: number;
    misses: number;
    keys: number;
    lastReset: string;
  }> = {}
) {
  return {
    hits: 100,
    misses: 20,
    keys: 50,
    lastReset: new Date().toISOString(),
    ...overrides,
  };
}

// ============================================================================
// MOCK MODULE TYPES
// ============================================================================

/**
 * Mock types for ManagerFactory
 */
export interface MockManagerFactory {
  createCacheManager: ReturnType<typeof vi.fn>;
}

/**
 * Mock types for CachedIngredientParser
 */
export interface MockCachedIngredientParser {
  parseIngredientLines: ReturnType<typeof vi.fn>;
  getCacheStats: ReturnType<typeof vi.fn>;
  invalidateIngredientCache: ReturnType<typeof vi.fn>;
}

/**
 * Mock types for actionCache
 */
export interface MockActionCache {
  getStats: ReturnType<typeof vi.fn>;
  clearAll: ReturnType<typeof vi.fn>;
  invalidateByPattern: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
}

/**
 * Mock types for BullMQ Queue
 */
export interface MockQueue {
  name: string;
  options?: QueueOptions;
  add: ReturnType<typeof vi.fn>;
  close: ReturnType<typeof vi.fn>;
  getJob: ReturnType<typeof vi.fn>;
  getJobs: ReturnType<typeof vi.fn>;
  getJobCounts: ReturnType<typeof vi.fn>;
  getWaiting: ReturnType<typeof vi.fn>;
  getActive: ReturnType<typeof vi.fn>;
  getCompleted: ReturnType<typeof vi.fn>;
  getFailed: ReturnType<typeof vi.fn>;
}
