import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Queue } from "bullmq";
import { NoteWorker, createNoteWorker } from "../note-worker";
import { MissingDependencyError } from "../../core/errors";
import { registerNoteActions } from "../actions";
import type { NoteJobData, NoteWorkerDependencies } from "../types";
import type { ActionContext } from "../../core/types";
import type { IServiceContainer } from "../../../services/container";
import type { PrismaClient } from "@prisma/client";
import type { HealthMonitor } from "../../../utils/health-monitor";
import { ErrorHandler } from "../../../utils/error-handler";
import type { ParsedHtmlFile } from "../schema";

// Spy on registerNoteActions
vi.mock("../actions", () => ({
  registerNoteActions: vi.fn(),
}));

// Minimal BaseAction mock
function makeBaseActionMock(name: string) {
  return {
    name,
    execute: vi.fn(),
    executeWithTiming: vi.fn(),
    withConfig: vi.fn(),
    severity: "info",
  };
}

class TestNoteWorker extends NoteWorker {
  public wrappedActions: Array<{ name: string; deps: NoteWorkerDependencies }> =
    [];
  public errorHandledActions: Array<{
    name: string;
    deps: NoteWorkerDependencies;
  }> = [];
  public registerActionsCalled = false;

  protected registerActions(): void {
    this.registerActionsCalled = true;
    registerNoteActions(this.actionFactory);
  }

  protected createWrappedAction(name: string, deps: NoteWorkerDependencies) {
    this.wrappedActions.push({ name, deps });
    return makeBaseActionMock(name);
  }

  protected createErrorHandledAction(
    name: string,
    deps: NoteWorkerDependencies
  ) {
    this.errorHandledActions.push({ name, deps });
    return makeBaseActionMock(name);
  }

  public testGetOperationName(): string {
    return this.getOperationName();
  }

  public testCreateActionPipeline(data: NoteJobData, context: ActionContext) {
    return this.createActionPipeline(data, context);
  }
}

// Helper to create a fully-typed mock IServiceContainer
function createMockServiceContainer(): IServiceContainer {
  return {
    queues: {
      ingredientQueue: { name: "ingredient-queue" } as Queue,
      instructionQueue: { name: "instruction-queue" } as Queue,
      imageQueue: { name: "image-queue" } as Queue,
      categorizationQueue: { name: "categorization-queue" } as Queue,
      sourceQueue: { name: "source-queue" } as Queue,
      noteQueue: { name: "note-queue" } as Queue,
    },
    database: {
      createNote: vi.fn().mockResolvedValue({ id: "note-1" }),
      prisma: {
        $disconnect: vi.fn(),
        $connect: vi.fn(),
        $on: vi.fn(),
        $use: vi.fn(),
        $transaction: vi.fn(),
        $executeRaw: vi.fn(),
        $queryRaw: vi.fn(),
        $runCommandRaw: vi.fn(),
        $extends: vi.fn(),
        note: {},
        status: {},
        user: {},
      } as unknown as PrismaClient,
    },
    errorHandler: {
      errorHandler: ErrorHandler,
    },
    healthMonitor: {
      healthMonitor: {
        healthCache: {},
        lastCheckTime: 0,
        CACHE_DURATION_MS: 0,
        TIMEOUT_MS: 0,
        checkHealth: vi.fn(),
        getStatus: vi.fn(),
        getUptime: vi.fn(),
        getLastCheck: vi.fn(),
        isHealthy: vi.fn(),
      } as unknown as HealthMonitor,
    },
    webSocket: {
      webSocketManager: {
        broadcastStatusEvent: vi.fn(),
        getConnectedClientsCount: vi.fn(),
        close: vi.fn(),
      },
    },
    statusBroadcaster: {
      statusBroadcaster: {
        addStatusEventAndBroadcast: vi.fn(),
      },
      addStatusEventAndBroadcast: vi.fn(),
    },
    parsers: {
      parsers: {
        parseHTML: vi.fn().mockResolvedValue({ parsed: true }),
      },
      parseHTML: vi.fn().mockResolvedValue({ parsed: true }),
    },
    logger: {
      log: vi.fn(),
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      fatal: vi.fn(),
      logWithContext: vi.fn(),
      getLogFiles: vi.fn(),
      rotateLogs: vi.fn(),
      getLogStats: vi.fn(),
      clearOldLogs: vi.fn(),
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
    close: vi.fn(),
  };
}

describe("NoteWorker", () => {
  let mockQueue: Queue;
  let mockContainer: IServiceContainer;
  let mockDependencies: Partial<NoteWorkerDependencies>;
  let worker: TestNoteWorker;

  beforeEach(() => {
    vi.clearAllMocks();
    mockQueue = { name: "note-queue" } as Queue;
    mockContainer = createMockServiceContainer();
    mockDependencies = {
      parseHTML: vi.fn(),
      createNote: vi.fn(),
      ingredientQueue: mockContainer.queues.ingredientQueue,
      instructionQueue: mockContainer.queues.instructionQueue,
      imageQueue: mockContainer.queues.imageQueue,
      categorizationQueue: mockContainer.queues.categorizationQueue,
      sourceQueue: mockContainer.queues.sourceQueue,
      addStatusEventAndBroadcast: vi.fn(),
      ErrorHandler: { withErrorHandling: vi.fn() },
      logger: { log: vi.fn() },
    };
    worker = new TestNoteWorker(
      mockQueue,
      mockDependencies as NoteWorkerDependencies,
      undefined,
      mockContainer
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should extend NoteWorker and initialize correctly", () => {
    expect(worker).toBeInstanceOf(NoteWorker);
  });

  it("should call registerNoteActions during initialization", () => {
    expect(registerNoteActions).toHaveBeenCalledWith(
      (worker as unknown as { actionFactory: unknown }).actionFactory
    );
  });

  it("getOperationName should return the correct operation name", () => {
    expect(worker.testGetOperationName()).toBe("note_processing");
  });

  describe("validateDependencies", () => {
    it("should pass validation when all dependencies are present", () => {
      expect(() => worker.validateDependencies()).not.toThrow();
    });
    it("should throw MissingDependencyError when parseHTML is missing", () => {
      (
        worker as unknown as { container: { parsers: { parseHTML: unknown } } }
      ).container.parsers!.parseHTML = undefined;
      expect(() => worker.validateDependencies()).toThrow(
        MissingDependencyError
      );
      expect(() => worker.validateDependencies()).toThrow(
        "parseHTML function is required"
      );
    });
    it("should throw MissingDependencyError when createNote is missing", () => {
      (
        worker as unknown as {
          container: { database: { createNote: unknown } };
        }
      ).container.database!.createNote = undefined;
      expect(() => worker.validateDependencies()).toThrow(
        MissingDependencyError
      );
      expect(() => worker.validateDependencies()).toThrow(
        "createNote function is required"
      );
    });
    it("should throw MissingDependencyError when both dependencies are missing", () => {
      (
        worker as unknown as {
          container: {
            parsers: { parseHTML: unknown };
            database: { createNote: unknown };
          };
        }
      ).container.parsers!.parseHTML = undefined;
      (
        worker as unknown as {
          container: {
            parsers: { parseHTML: unknown };
            database: { createNote: unknown };
          };
        }
      ).container.database!.createNote = undefined;
      expect(() => worker.validateDependencies()).toThrow(
        MissingDependencyError
      );
    });
  });

  describe("createActionPipeline", () => {
    it("should create the correct pipeline with all actions", () => {
      const mockData = { content: "test content" } as NoteJobData;
      const mockContext: ActionContext = {
        jobId: "test-job",
        retryCount: 0,
        queueName: "test-queue",
        operation: "test",
        startTime: Date.now(),
        workerName: "test-worker",
        attemptNumber: 1,
      };
      const pipeline = worker.testCreateActionPipeline(mockData, mockContext);
      expect(pipeline).toHaveLength(4); // clean_html, parse_html, save_note, and note_completed_status
      expect(worker.wrappedActions).toEqual([
        { name: "clean_html", deps: mockDependencies },
        { name: "parse_html", deps: mockDependencies },
        { name: "save_note", deps: mockDependencies },
      ]);
      expect(worker.errorHandledActions).toEqual([
        { name: "note_completed_status", deps: mockDependencies },
      ]);
    });
    it("should not include schedule actions when they are commented out", () => {
      const mockData = { content: "test content" } as NoteJobData;
      const mockContext: ActionContext = {
        jobId: "test-job",
        retryCount: 0,
        queueName: "test-queue",
        operation: "test",
        startTime: Date.now(),
        workerName: "test-worker",
        attemptNumber: 1,
      };
      worker.testCreateActionPipeline(mockData, mockContext);
      const scheduled = worker.errorHandledActions.map((a) => a.name);
      expect(scheduled).not.toContain("schedule_source");
      expect(scheduled).not.toContain("schedule_images");
      expect(scheduled).not.toContain("schedule_ingredients");
      expect(scheduled).not.toContain("schedule_instructions");
    });
  });

  describe("Type Checking Methods", () => {
    it("should throw error when getExpectedOutputType is called", () => {
      expect(() => worker.getExpectedOutputType()).toThrow(
        "This method is for type checking only"
      );
    });
    it("should throw error when getPipelineStageType is called", () => {
      expect(() => worker.getPipelineStageType(1)).toThrow(
        "This method is for type checking only"
      );
    });
  });
});

describe("createNoteWorker", () => {
  let mockQueue: Queue;
  let mockContainer: IServiceContainer;

  beforeEach(() => {
    vi.clearAllMocks();
    mockQueue = { name: "note-queue" } as Queue;
    mockContainer = createMockServiceContainer();
  });

  it("should create a NoteWorker with correct dependencies", () => {
    const worker = createNoteWorker(mockQueue, mockContainer);
    expect(worker).toBeInstanceOf(NoteWorker);
    expect(worker.validateDependencies).toBeDefined();
  });
  it("should validate dependencies after creation", () => {
    const validateSpy = vi.spyOn(NoteWorker.prototype, "validateDependencies");
    createNoteWorker(mockQueue, mockContainer);
    expect(validateSpy).toHaveBeenCalled();
  });
  it("should throw error when parseHTML is missing", () => {
    mockContainer.parsers.parseHTML = undefined;
    expect(() => createNoteWorker(mockQueue, mockContainer)).toThrow(
      MissingDependencyError
    );
  });
  it("should throw error when createNote is missing", () => {
    mockContainer.database.createNote = undefined;
    expect(() => createNoteWorker(mockQueue, mockContainer)).toThrow(
      MissingDependencyError
    );
  });
});

describe("createNoteDependenciesFromContainer", () => {
  let mockContainer: IServiceContainer;
  beforeEach(() => {
    vi.clearAllMocks();
    mockContainer = createMockServiceContainer();
  });
  function getDeps() {
    // Use the real createNoteWorker to get the dependencies
    const worker = createNoteWorker({} as Queue, mockContainer);
    return (worker as unknown as { dependencies: NoteWorkerDependencies })
      .dependencies;
  }
  it("should create dependencies with correct queue references", () => {
    const deps = getDeps();
    expect(deps.ingredientQueue).toBe(mockContainer.queues.ingredientQueue);
    expect(deps.instructionQueue).toBe(mockContainer.queues.instructionQueue);
    expect(deps.imageQueue).toBe(mockContainer.queues.imageQueue);
    expect(deps.categorizationQueue).toBe(
      mockContainer.queues.categorizationQueue
    );
    expect(deps.sourceQueue).toBe(mockContainer.queues.sourceQueue);
  });
  it("should create parseHTML function that calls container parser", async () => {
    const deps = getDeps();
    const result = await deps.parseHTML("test content");
    expect(mockContainer.parsers.parseHTML).toHaveBeenCalledWith(
      "test content"
    );
    expect(result).toEqual({ parsed: true });
  });
  it("should create createNote function that calls container database", async () => {
    const deps = getDeps();
    const testFile: ParsedHtmlFile = {
      title: "Test Recipe",
      contents: "Test content",
      ingredients: [],
      instructions: [],
    };
    const result = await deps.createNote(testFile);
    expect(mockContainer.database.createNote).toHaveBeenCalledWith(testFile);
    expect(result).toEqual({ id: "note-1" });
  });
  it("should throw error when parseHTML is not available", async () => {
    // Create a container with parseHTML undefined but still present in parsers
    const testContainer = {
      ...mockContainer,
      parsers: { parseHTML: undefined },
    } as unknown as IServiceContainer; // Intentionally break interface for negative test

    // Mock the validateDependencies method to avoid the early throw
    const validateSpy = vi.spyOn(NoteWorker.prototype, "validateDependencies");
    validateSpy.mockImplementation(() => {}); // No-op to avoid validation

    try {
      const worker = createNoteWorker({} as Queue, testContainer);
      const deps = (
        worker as unknown as { dependencies: NoteWorkerDependencies }
      ).dependencies;

      await expect(deps.parseHTML("test content")).rejects.toThrow(
        "parseHTML function not available"
      );
    } finally {
      validateSpy.mockRestore();
    }
  });

  it("should throw error when createNote function is not available in container", async () => {
    // Create a container with createNote undefined but still present in database
    const testContainer = {
      ...mockContainer,
      database: {
        createNote: undefined,
        prisma: mockContainer.database.prisma,
      },
    } as unknown as IServiceContainer; // Intentionally break interface for negative test

    // Mock the validateDependencies method to avoid the early throw
    const validateSpy = vi.spyOn(NoteWorker.prototype, "validateDependencies");
    validateSpy.mockImplementation(() => {}); // No-op to avoid validation

    try {
      const worker = createNoteWorker({} as Queue, testContainer);
      const deps = (
        worker as unknown as { dependencies: NoteWorkerDependencies }
      ).dependencies;
      const testFile: ParsedHtmlFile = {
        title: "Test Recipe",
        contents: "Test content",
        ingredients: [],
        instructions: [],
      };

      await expect(deps.createNote(testFile)).rejects.toThrow(
        "createNote function not available"
      );
    } finally {
      validateSpy.mockRestore();
    }
  });

  it("should handle parseHTML when container.parsers is undefined", async () => {
    const testContainer = {
      ...mockContainer,
      parsers: undefined,
    } as unknown as IServiceContainer; // Intentionally break interface for negative test

    // Mock the validateDependencies method to avoid the early throw
    const validateSpy = vi.spyOn(NoteWorker.prototype, "validateDependencies");
    validateSpy.mockImplementation(() => {}); // No-op to avoid validation

    try {
      const worker = createNoteWorker({} as Queue, testContainer);
      const deps = (
        worker as unknown as { dependencies: NoteWorkerDependencies }
      ).dependencies;

      await expect(deps.parseHTML("test content")).rejects.toThrow(
        "parseHTML function not available"
      );
    } finally {
      validateSpy.mockRestore();
    }
  });

  it("should handle createNote when container.database is undefined", async () => {
    const testContainer = {
      ...mockContainer,
      database: undefined,
    } as unknown as IServiceContainer; // Intentionally break interface for negative test

    // Mock the validateDependencies method to avoid the early throw
    const validateSpy = vi.spyOn(NoteWorker.prototype, "validateDependencies");
    validateSpy.mockImplementation(() => {}); // No-op to avoid validation

    try {
      const worker = createNoteWorker({} as Queue, testContainer);
      const deps = (
        worker as unknown as { dependencies: NoteWorkerDependencies }
      ).dependencies;
      const testFile: ParsedHtmlFile = {
        title: "Test Recipe",
        contents: "Test content",
        ingredients: [],
        instructions: [],
      };

      await expect(deps.createNote(testFile)).rejects.toThrow(
        "createNote function not available"
      );
    } finally {
      validateSpy.mockRestore();
    }
  });
});
