import { describe, it, expect, vi, beforeEach } from "vitest";
import { ErrorType, ErrorSeverity } from "../../types";
import {
  createMockServiceContainer,
  createMockActionContext,
  createMockLogger,
  createMockErrorHandler,
  createMockStatusBroadcaster,
  createMockNoteJobData,
  createMockParsedHtmlFile,
  expectActionToHaveBeenCalledWith,
  expectActionToHaveBeenCalledTimes,
  expectActionToHaveBeenCalledOnce,
  expectActionToHaveBeenCalledWithMatch,
} from "./test-utils";

describe("test-utils", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createMockServiceContainer", () => {
    it("should create a mock service container with all required properties", () => {
      const container = createMockServiceContainer();

      expect(container.queues).toBeDefined();
      expect(container.database).toBeDefined();
      expect(container.errorHandler).toBeDefined();
      expect(container.healthMonitor).toBeDefined();
      expect(container.webSocket).toBeDefined();
      expect(container.statusBroadcaster).toBeDefined();
      expect(container.parsers).toBeDefined();
      expect(container.logger).toBeDefined();
      expect(container.config).toBeDefined();
      expect(container.close).toBeDefined();
    });

    it("should have mock queue methods that return expected values", async () => {
      const container = createMockServiceContainer();

      const noteJob = await container.queues.noteQueue.add("process-note", {});
      expect(noteJob).toEqual({ id: "test-note-job" });

      const imageJob = await container.queues.imageQueue.add(
        "process-image",
        {}
      );
      expect(imageJob).toEqual({ id: "test-image-job" });

      const ingredientJob = await container.queues.ingredientQueue.add(
        "process-ingredient",
        {}
      );
      expect(ingredientJob).toEqual({ id: "test-ingredient-job" });

      const instructionJob = await container.queues.instructionQueue.add(
        "process-instruction",
        {}
      );
      expect(instructionJob).toEqual({ id: "test-instruction-job" });

      const categorizationJob = await container.queues.categorizationQueue.add(
        "process-categorization",
        {}
      );
      expect(categorizationJob).toEqual({ id: "test-categorization-job" });

      const sourceJob = await container.queues.sourceQueue.add(
        "process-source",
        {}
      );
      expect(sourceJob).toEqual({ id: "test-source-job" });
    });

    it("should have mock database methods", async () => {
      const container = createMockServiceContainer();

      const mockFile = {
        title: "Test Recipe",
        contents: "Test content",
        ingredients: [],
        instructions: [],
      };

      const note = await container.database.createNote!(mockFile);
      expect(note).toEqual({
        id: "test-note-id",
        title: "Test Note",
        content: "Test content",
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
        parsedIngredientLines: [],
        parsedInstructionLines: [],
      });

      await container.database.prisma.$disconnect();
      expect(container.database.prisma.$disconnect).toHaveBeenCalled();
    });

    it("should have mock error handler methods", async () => {
      const container = createMockServiceContainer();

      const result =
        await container.errorHandler.errorHandler.withErrorHandling(() =>
          Promise.resolve("test result")
        );
      expect(result).toBe("test result");

      const error = container.errorHandler.errorHandler.createJobError(
        new Error("test error"),
        ErrorType.UNKNOWN_ERROR,
        ErrorSeverity.HIGH,
        { context: "test" }
      );
      expect(error).toEqual({
        message: "test error",
        type: ErrorType.UNKNOWN_ERROR,
        severity: ErrorSeverity.HIGH,
        context: { context: "test" },
        timestamp: expect.any(Date),
      });

      const classifiedError = container.errorHandler.errorHandler.classifyError(
        new Error("test error")
      );
      expect(classifiedError).toEqual({
        message: "test error",
        type: "UNKNOWN_ERROR",
        severity: "MEDIUM",
        context: {},
        timestamp: expect.any(Date),
      });
    });

    it("should have mock health monitor", async () => {
      const container = createMockServiceContainer();

      const health = await container.healthMonitor.healthMonitor.getHealth();
      expect(health).toEqual({
        status: "healthy",
        timestamp: expect.any(String),
      });
    });

    it("should have mock parsers", async () => {
      const container = createMockServiceContainer();

      const parsed = await container.parsers.parseHTML!("<html></html>");
      expect(parsed).toEqual({
        title: "Test HTML",
        contents: "Test HTML content",
        ingredients: [],
        instructions: [],
      });

      const parsedFromParsers =
        await container.parsers.parsers!.parseHTML("<html></html>");
      expect(parsedFromParsers).toEqual({
        title: "Test HTML",
        contents: "Test HTML content",
        ingredients: [],
        instructions: [],
      });
    });

    it("should have mock status broadcaster", async () => {
      const container = createMockServiceContainer();

      await container.statusBroadcaster.addStatusEventAndBroadcast({
        noteId: "test-note",
        status: "PENDING",
      });
      expect(
        container.statusBroadcaster.addStatusEventAndBroadcast
      ).toHaveBeenCalled();
    });

    it("should have mock logger", () => {
      const container = createMockServiceContainer();

      container.logger.log("test message");
      expect(container.logger.log).toHaveBeenCalledWith("test message");
    });

    it("should have expected config values", () => {
      const container = createMockServiceContainer();

      expect(container.config).toEqual({
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
      });
    });

    it("should have mock close method", async () => {
      const container = createMockServiceContainer();

      await container.close();
      expect(container.close).toHaveBeenCalled();
    });
  });

  describe("createMockActionContext", () => {
    it("should create a mock action context with default values", () => {
      const context = createMockActionContext();

      expect(context).toEqual({
        jobId: "test-job-123",
        retryCount: 0,
        queueName: "test-queue",
        noteId: "test-note-456",
        operation: "test_operation",
        startTime: expect.any(Number),
        workerName: "test_worker",
        attemptNumber: 1,
      });
    });

    it("should allow overriding default values", () => {
      const overrides = {
        jobId: "custom-job-id",
        retryCount: 2,
        queueName: "custom-queue",
      };

      const context = createMockActionContext(overrides);

      expect(context.jobId).toBe("custom-job-id");
      expect(context.retryCount).toBe(2);
      expect(context.queueName).toBe("custom-queue");
      expect(context.noteId).toBe("test-note-456"); // unchanged
    });
  });

  describe("createMockLogger", () => {
    it("should create a mock logger with log method", () => {
      const logger = createMockLogger();

      expect(logger.log).toBeDefined();
      expect(typeof logger.log).toBe("function");

      logger.log("test message");
      expect(logger.log).toHaveBeenCalledWith("test message");
    });
  });

  describe("createMockErrorHandler", () => {
    it("should create a mock error handler with all required methods", async () => {
      const errorHandler = createMockErrorHandler();

      expect(errorHandler.withErrorHandling).toBeDefined();
      expect(errorHandler.createJobError).toBeDefined();
      expect(errorHandler.classifyError).toBeDefined();
      expect(errorHandler.logError).toBeDefined();
    });

    it("should handle operations with withErrorHandling", async () => {
      const errorHandler = createMockErrorHandler();

      const result = await errorHandler.withErrorHandling(() =>
        Promise.resolve("success")
      );
      expect(result).toBe("success");
    });

    it("should create job errors with createJobError", () => {
      const errorHandler = createMockErrorHandler();

      const jobError = errorHandler.createJobError(
        new Error("test error"),
        "TEST_ERROR",
        "HIGH",
        { context: "test" }
      );

      expect(jobError).toEqual({
        message: "test error",
        type: "TEST_ERROR",
        severity: "HIGH",
        context: { context: "test" },
        timestamp: expect.any(Date),
      });
    });

    it("should classify errors with classifyError", () => {
      const errorHandler = createMockErrorHandler();

      const classifiedError = errorHandler.classifyError(
        new Error("test error")
      );

      expect(classifiedError).toEqual({
        message: "test error",
        type: "UNKNOWN_ERROR",
        severity: "MEDIUM",
        context: {},
        timestamp: expect.any(Date),
      });
    });

    it("should have logError method", () => {
      const errorHandler = createMockErrorHandler();

      errorHandler.logError("test error");
      expect(errorHandler.logError).toHaveBeenCalledWith("test error");
    });
  });

  describe("createMockStatusBroadcaster", () => {
    it("should create a mock status broadcaster function", async () => {
      const broadcaster = createMockStatusBroadcaster();

      expect(typeof broadcaster).toBe("function");

      await broadcaster({ status: "test" });
      expect(broadcaster).toHaveBeenCalledWith({ status: "test" });
    });
  });

  describe("createMockNoteJobData", () => {
    it("should create mock note job data with default values", () => {
      const data = createMockNoteJobData();

      expect(data).toEqual({
        content: "<html><body><h1>Test Recipe</h1></body></html>",
        noteId: "test-note-123",
        metadata: {
          jobId: "test-job-123",
          workerName: "note_worker",
          attemptNumber: 1,
          maxRetries: 3,
          createdAt: expect.any(Date),
          priority: 5,
          timeout: 30000,
        },
      });
    });

    it("should allow overriding default values", () => {
      const overrides = {
        content: "<html><body><h1>Custom Recipe</h1></body></html>",
        noteId: "custom-note-id",
        metadata: {
          jobId: "custom-job-id",
          priority: 10,
        },
      };

      const data = createMockNoteJobData(overrides);

      expect(data.content).toBe(
        "<html><body><h1>Custom Recipe</h1></body></html>"
      );
      expect(data.noteId).toBe("custom-note-id");
      expect(data.metadata.jobId).toBe("custom-job-id");
      expect(data.metadata.priority).toBe(10);
      expect(data.metadata.workerName).toBeUndefined(); // overridden
    });
  });

  describe("createMockParsedHtmlFile", () => {
    it("should create mock parsed HTML file with default values", () => {
      const parsedFile = createMockParsedHtmlFile();

      expect(parsedFile).toEqual({
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
      });
    });

    it("should allow overriding default values", () => {
      const overrides = {
        title: "Custom Recipe",
        ingredients: [{ name: "Test Ingredient" }],
        instructions: [{ text: "Test Instruction" }],
        tags: ["custom", "recipe"],
      };

      const parsedFile = createMockParsedHtmlFile(overrides);

      expect(parsedFile.title).toBe("Custom Recipe");
      expect(parsedFile.ingredients).toEqual([{ name: "Test Ingredient" }]);
      expect(parsedFile.instructions).toEqual([{ text: "Test Instruction" }]);
      expect(parsedFile.tags).toEqual(["custom", "recipe"]);
      expect(parsedFile.contents).toBe("Test recipe content"); // unchanged
    });
  });

  describe("expectActionToHaveBeenCalledWith", () => {
    it("should verify action was called with exact parameters", () => {
      const mockAction = vi.fn();
      const expectedData = { test: "data" };
      const expectedDeps = { dep: "value" };
      const expectedContext = { context: "info" };

      mockAction(expectedData, expectedDeps, expectedContext);

      expectActionToHaveBeenCalledWith(
        mockAction,
        expectedData,
        expectedDeps,
        expectedContext
      );
    });

    it("should fail when action was not called with expected parameters", () => {
      const mockAction = vi.fn();
      const expectedData = { test: "data" };
      const expectedDeps = { dep: "value" };
      const expectedContext = { context: "info" };

      mockAction({ different: "data" }, expectedDeps, expectedContext);

      expect(() => {
        expectActionToHaveBeenCalledWith(
          mockAction,
          expectedData,
          expectedDeps,
          expectedContext
        );
      }).toThrow();
    });
  });

  describe("expectActionToHaveBeenCalledTimes", () => {
    it("should verify action was called the expected number of times", () => {
      const mockAction = vi.fn();

      mockAction();
      mockAction();

      expectActionToHaveBeenCalledTimes(mockAction, 2);
    });

    it("should fail when action was called different number of times", () => {
      const mockAction = vi.fn();

      mockAction();

      expect(() => {
        expectActionToHaveBeenCalledTimes(mockAction, 2);
      }).toThrow();
    });
  });

  describe("expectActionToHaveBeenCalledOnce", () => {
    it("should verify action was called exactly once", () => {
      const mockAction = vi.fn();

      mockAction();

      expectActionToHaveBeenCalledOnce(mockAction);
    });

    it("should fail when action was called multiple times", () => {
      const mockAction = vi.fn();

      mockAction();
      mockAction();

      expect(() => {
        expectActionToHaveBeenCalledOnce(mockAction);
      }).toThrow();
    });

    it("should fail when action was not called", () => {
      const mockAction = vi.fn();

      expect(() => {
        expectActionToHaveBeenCalledOnce(mockAction);
      }).toThrow();
    });
  });

  describe("expectActionToHaveBeenCalledWithMatch", () => {
    it("should verify action was called with matching parameters", () => {
      const mockAction = vi.fn();
      const expectedData = { test: "data" };
      const expectedDeps = { dep: "value" };
      const expectedContext = { context: "info" };

      mockAction(
        { test: "data", extra: "field" },
        { dep: "value", another: "field" },
        { context: "info", additional: "field" }
      );

      expectActionToHaveBeenCalledWithMatch(
        mockAction,
        expectedData,
        expectedDeps,
        expectedContext
      );
    });

    it("should fail when action was not called with matching parameters", () => {
      const mockAction = vi.fn();
      const expectedData = { test: "data" };
      const expectedDeps = { dep: "value" };
      const expectedContext = { context: "info" };

      mockAction({ different: "data" }, { dep: "value" }, { context: "info" });

      expect(() => {
        expectActionToHaveBeenCalledWithMatch(
          mockAction,
          expectedData,
          expectedDeps,
          expectedContext
        );
      }).toThrow();
    });
  });
});
