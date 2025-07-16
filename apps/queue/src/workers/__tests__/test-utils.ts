import { vi, type MockedFunction, expect } from "vitest";
import type { IServiceContainer } from "../../services/container";
import type { ActionContext } from "../core/types";

// ============================================================================
// MOCK SERVICE CONTAINER
// ============================================================================

export function createMockServiceContainer(): IServiceContainer {
  return {
    queues: {
      noteQueue: {
        add: vi.fn().mockResolvedValue({ id: "test-note-job" }),
        close: vi.fn().mockResolvedValue(undefined),
      } as any,
      imageQueue: {
        add: vi.fn().mockResolvedValue({ id: "test-image-job" }),
        close: vi.fn().mockResolvedValue(undefined),
      } as any,
      ingredientQueue: {
        add: vi.fn().mockResolvedValue({ id: "test-ingredient-job" }),
        close: vi.fn().mockResolvedValue(undefined),
      } as any,
      instructionQueue: {
        add: vi.fn().mockResolvedValue({ id: "test-instruction-job" }),
        close: vi.fn().mockResolvedValue(undefined),
      } as any,
      categorizationQueue: {
        add: vi.fn().mockResolvedValue({ id: "test-categorization-job" }),
        close: vi.fn().mockResolvedValue(undefined),
      } as any,
      sourceQueue: {
        add: vi.fn().mockResolvedValue({ id: "test-source-job" }),
        close: vi.fn().mockResolvedValue(undefined),
      } as any,
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
      } as any,
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
      } as any,
    },
    healthMonitor: {
      healthMonitor: {
        getHealth: vi.fn().mockResolvedValue({
          status: "healthy",
          timestamp: new Date().toISOString(),
        }),
      } as any,
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

export function createMockLogger() {
  return {
    log: vi.fn(),
  };
}

export function createMockErrorHandler() {
  return {
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
  };
}

export function createMockStatusBroadcaster() {
  return vi.fn().mockResolvedValue(undefined);
}

// ============================================================================
// TEST DATA HELPERS
// ============================================================================

export function createMockNoteJobData(overrides: Record<string, any> = {}) {
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

export function createMockParsedHtmlFile(overrides: Record<string, any> = {}) {
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
  mockAction: MockedFunction<any>,
  expectedData: any,
  expectedDeps: any,
  expectedContext: any
) {
  expect(mockAction).toHaveBeenCalledWith(
    expectedData,
    expectedDeps,
    expectedContext
  );
}

export function expectActionToHaveBeenCalledTimes(
  mockAction: MockedFunction<any>,
  times: number
) {
  expect(mockAction).toHaveBeenCalledTimes(times);
}

export function expectActionToHaveBeenCalledOnce(
  mockAction: MockedFunction<any>
) {
  expect(mockAction).toHaveBeenCalledTimes(1);
}

export function expectActionToHaveBeenCalledWithMatch(
  mockAction: MockedFunction<any>,
  expectedData: any,
  expectedDeps: any,
  expectedContext: any
) {
  expect(mockAction).toHaveBeenCalledWith(
    expect.objectContaining(expectedData),
    expect.objectContaining(expectedDeps),
    expect.objectContaining(expectedContext)
  );
}
