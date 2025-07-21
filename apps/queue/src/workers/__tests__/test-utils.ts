import { PrismaClient } from "@peas/database";
import type { Queue } from "bullmq";
import { type MockedFunction, expect, vi } from "vitest";

import type { IServiceContainer } from "../../services/container";
import { HealthMonitor } from "../../utils/health-monitor";
import { ActionFactory } from "../core/action-factory";
import type { ActionContext } from "../core/types";
import { PatternTracker } from "../shared/pattern-tracker";

// ============================================================================
// MOCK SERVICE CONTAINER
// ============================================================================

export function createMockServiceContainer(): IServiceContainer {
  return {
    queues: {
      noteQueue: {
        add: vi.fn().mockResolvedValue({ id: "test-note-job" }),
        close: vi.fn().mockResolvedValue(undefined),
      } as unknown as Queue,
      imageQueue: {
        add: vi.fn().mockResolvedValue({ id: "test-image-job" }),
        close: vi.fn().mockResolvedValue(undefined),
      } as unknown as Queue,
      ingredientQueue: {
        add: vi.fn().mockResolvedValue({ id: "test-ingredient-job" }),
        close: vi.fn().mockResolvedValue(undefined),
      } as unknown as Queue,
      instructionQueue: {
        add: vi.fn().mockResolvedValue({ id: "test-instruction-job" }),
        close: vi.fn().mockResolvedValue(undefined),
      } as unknown as Queue,
      categorizationQueue: {
        add: vi.fn().mockResolvedValue({ id: "test-categorization-job" }),
        close: vi.fn().mockResolvedValue(undefined),
      } as unknown as Queue,
      sourceQueue: {
        add: vi.fn().mockResolvedValue({ id: "test-source-job" }),
        close: vi.fn().mockResolvedValue(undefined),
      } as unknown as Queue,
    },
    database: {
      createNote: vi.fn().mockResolvedValue({
        id: "test-note-id",
        title: "Test Note",
        content: "Test content",
        createdAt: new Date(),
        updatedAt: new Date(),
        parsedIngredientLines: [],
        parsedInstructionLines: [],
      }),
      prisma: {
        $disconnect: vi.fn().mockResolvedValue(undefined),
      } as unknown as typeof import("@peas/database").prisma,
      patternTracker: new PatternTracker({} as PrismaClient),
      updateInstructionLine: vi.fn(),
      createInstructionSteps: vi.fn(),
      updateNoteCompletionTracker: vi.fn(),
      incrementNoteCompletionTracker: vi.fn(),
      checkNoteCompletion: vi.fn(),
      getNoteTitle: vi.fn(),
    },
    errorHandler: {
      errorHandler: {
        withErrorHandling: vi.fn().mockImplementation(async (operation) => {
          return await operation();
        }),
        createJobError: vi
          .fn()
          .mockImplementation((error, type, severity, context) => ({
            message: error.message,
            type,
            severity,
            context,
            timestamp: new Date(),
          })),
        classifyError: vi.fn().mockImplementation((error) => ({
          message: error.message,
          type: "UNKNOWN_ERROR",
          severity: "MEDIUM",
          context: {},
          timestamp: new Date(),
        })),
        logError: vi.fn(),
      } as any, // eslint-disable-line @typescript-eslint/no-explicit-any -- Test mock - intentionally partial implementation
    },
    healthMonitor: {
      healthMonitor: {
        getHealth: vi.fn().mockResolvedValue({
          status: "healthy",
          timestamp: new Date().toISOString(),
        }),
      } as any, // eslint-disable-line @typescript-eslint/no-explicit-any -- Test mock - intentionally partial implementation
    },
    webSocket: {
      webSocketManager: null,
    },
    statusBroadcaster: {
      statusBroadcaster: null,
      addStatusEventAndBroadcast: vi.fn().mockResolvedValue(undefined),
    },
    parsers: {
      parsers: {
        parseHTML: vi.fn().mockResolvedValue({
          title: "Test HTML",
          contents: "Test HTML content",
          ingredients: [],
          instructions: [],
        }),
      },
      parseHTML: vi.fn().mockResolvedValue({
        title: "Test HTML",
        contents: "Test HTML content",
        ingredients: [],
        instructions: [],
      }),
    },
    logger: {
      log: vi.fn(),
    },
    config: {
      port: 4200,
      wsPort: 8080,
      wsHost: "localhost",
      wsUrl: "ws://localhost:8080",
      redisConnection: {
        host: "localhost",
        port: 6379,
        username: undefined,
        password: undefined,
      },
      batchSize: 10,
      maxRetries: 3,
      backoffMs: 1000,
      maxBackoffMs: 30000,
    },
    close: vi.fn().mockResolvedValue(undefined),
  };
}

// ============================================================================
// MOCK ACTION CONTEXT
// ============================================================================

export function createMockActionContext(
  overrides: Partial<ActionContext> = {}
): ActionContext {
  return {
    jobId: "test-job-123",
    retryCount: 0,
    queueName: "test-queue",
    noteId: "test-note-456",
    operation: "test_operation",
    startTime: Date.now(),
    workerName: "test_worker",
    attemptNumber: 1,
    ...overrides,
  };
}

// ============================================================================
// MOCK DEPENDENCIES
// ============================================================================

/**
 * Generic mock for ErrorHandler (reusable for all worker/queue tests)
 */
export function createMockErrorHandler() {
  return {
    withErrorHandling: vi.fn(async (operation) => await operation()),
    createJobError: vi.fn((error, type, severity, context) => ({
      message: error.message,
      type,
      severity,
      context,
      timestamp: new Date(),
    })),
    classifyError: vi.fn((error) => ({
      message: error.message,
      type: "UNKNOWN_ERROR",
      severity: "MEDIUM",
      context: {},
      timestamp: new Date(),
    })),
    logError: vi.fn(),
  };
}

/**
 * Generic mock for HealthMonitor (reusable for all worker/queue tests)
 */
export function createMockHealthMonitor(): HealthMonitor {
  return {
    healthCache: {},
    lastCheckTime: 0,
    CACHE_DURATION_MS: 0,
    TIMEOUT_MS: 0,
    getInstance: vi.fn(),
    check: vi.fn(),
    getStatus: vi.fn(),
    updateStatus: vi.fn(),
    getHealth: vi.fn(),
    performHealthChecks: vi.fn(),
    checkDatabaseHealth: vi.fn(),
    checkRedisHealth: vi.fn(),
    checkQueueHealth: vi.fn(),
    checkWebSocketHealth: vi.fn(),
    checkConfigHealth: vi.fn(),
    checkMetricsHealth: vi.fn(),
    checkParsersHealth: vi.fn(),
    checkWorkersHealth: vi.fn(),
    checkLoggerHealth: vi.fn(),
  } as unknown as HealthMonitor;
}

/**
 * Generic mock for logger (reusable for all worker/queue tests)
 */
export function createMockLogger() {
  return { log: vi.fn() };
}
export const mockLogger = createMockLogger();

/**
 * Generic mock for QueueService (reusable for all worker/queue tests)
 */
export const mockQueueService = {
  noteQueue: {} as Queue,
  imageQueue: {} as Queue,
  ingredientQueue: {} as Queue,
  instructionQueue: {} as Queue,
  categorizationQueue: {} as Queue,
  sourceQueue: {} as Queue,
};

/**
 * Generic mock for ActionFactory (reusable for all worker/queue tests)
 */
export const mockActionFactory = new ActionFactory();

export function createMockStatusBroadcaster() {
  return vi.fn().mockResolvedValue(undefined);
}

// ============================================================================
// TEST DATA HELPERS
// ============================================================================

export function createMockNoteJobData(overrides: Record<string, unknown> = {}) {
  return {
    content: "<html><body><h1>Test Recipe</h1></body></html>",
    noteId: "test-note-123",
    metadata: {
      jobId: "test-job-123",
      workerName: "note_worker",
      attemptNumber: 1,
      maxRetries: 3,
      createdAt: new Date(),
      priority: 5,
      timeout: 30000,
    },
    ...overrides,
  };
}

export function createMockParsedHtmlFile(
  overrides: Record<string, unknown> = {}
) {
  return {
    title: "Test Recipe",
    contents: "Test recipe content",
    tags: [],
    source: undefined,
    sourceUrl: undefined,
    sourceApplication: undefined,
    created: undefined,
    historicalCreatedAt: undefined,
    ingredients: [],
    instructions: [],
    image: undefined,
    images: undefined,
    metadata: {},
    ...overrides,
  };
}

// ============================================================================
// ASSERTION HELPERS
// ============================================================================

export function expectActionToHaveBeenCalledWith(
  mockAction: MockedFunction<(...args: unknown[]) => unknown>,
  expectedData: unknown,
  expectedDeps: unknown,
  expectedContext: unknown
) {
  expect(mockAction).toHaveBeenCalledWith(
    expectedData,
    expectedDeps,
    expectedContext
  );
}

export function expectActionToHaveBeenCalledTimes(
  mockAction: MockedFunction<(...args: unknown[]) => unknown>,
  times: number
) {
  expect(mockAction).toHaveBeenCalledTimes(times);
}

export function expectActionToHaveBeenCalledOnce(
  mockAction: MockedFunction<(...args: unknown[]) => unknown>
) {
  expect(mockAction).toHaveBeenCalledTimes(1);
}

export function expectActionToHaveBeenCalledWithMatch(
  mockAction: MockedFunction<(...args: unknown[]) => unknown>,
  expectedData: unknown,
  expectedDeps: unknown,
  expectedContext: unknown
) {
  expect(mockAction).toHaveBeenCalledWith(
    expect.objectContaining(expectedData),
    expect.objectContaining(expectedDeps),
    expect.objectContaining(expectedContext)
  );
}
