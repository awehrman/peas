import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Job, Queue } from "bullmq";
import { processIngredientJob } from "../../../../src/workers/ingredients/process-job";
import { QueueError } from "../../../../src/utils/error-handler";
import {
  ErrorType,
  ErrorSeverity,
  IngredientJobData,
} from "../../../../src/types";

// Mock dependencies
vi.mock("@peas/database", () => ({
  PrismaClient: vi.fn().mockImplementation(() => ({
    parsedIngredientLine: {
      update: vi.fn(),
    },
    note: {
      update: vi.fn(),
    },
    $disconnect: vi.fn(),
  })),
  prisma: {
    parsedIngredientLine: {
      update: vi.fn(),
    },
    note: {
      update: vi.fn(),
    },
  },
}));

vi.mock("@peas/parser", () => ({
  parse: vi.fn(),
}));

vi.mock("../../../../src/utils/status-broadcaster", () => ({
  addStatusEventAndBroadcast: vi.fn(),
}));

vi.mock("../../../../src/utils/error-handler", async () => {
  const actual = await import("../../../../src/utils/error-handler");
  return {
    ...actual,
    ErrorHandler: {
      ...actual.ErrorHandler,
      validateJobData: vi.fn(),
      createJobError: vi.fn(),
      logError: vi.fn(),
      withErrorHandling: vi.fn(),
      shouldRetry: vi.fn(),
      calculateBackoff: vi.fn(),
      classifyError: vi.fn(),
    },
  };
});

vi.mock("../../../../src/utils/health-monitor", async () => {
  const actual = await import("../../../../src/utils/health-monitor");
  return {
    ...actual,
    HealthMonitor: {
      ...actual.HealthMonitor,
      getInstance: vi.fn(() => ({
        isHealthy: vi.fn().mockResolvedValue(true),
      })),
    },
  };
});

describe("Ingredient Process Job", () => {
  let mockJob: Job;
  let mockQueue: Queue;
  let mockConsoleLog: any;

  const mockJobData: IngredientJobData = {
    note: {
      id: "note-id",
      parsedIngredientLines: [
        { id: "line-1", reference: "1 cup flour" },
        { id: "line-2", reference: "2 eggs" },
        { id: "line-3", reference: "1/2 cup milk" },
      ],
    } as any,
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    // Mock console methods
    mockConsoleLog = vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});

    // Mock Job
    mockJob = {
      id: "job-id",
      attemptsMade: 0,
      data: mockJobData,
    } as Job;

    // Mock Queue
    mockQueue = {
      name: "test-ingredient-queue",
    } as Queue;

    // Setup default mocks
    const { ErrorHandler } = await import(
      "../../../../src/utils/error-handler"
    );
    const { HealthMonitor } = await import(
      "../../../../src/utils/health-monitor"
    );
    const { addStatusEventAndBroadcast } = await import(
      "../../../../src/utils/status-broadcaster"
    );
    const { prisma } = await import("@peas/database");
    const { parse: Parser } = await import("@peas/parser");

    // Default successful responses
    vi.mocked(ErrorHandler.validateJobData).mockReturnValue(null);
    vi.mocked(HealthMonitor.getInstance().isHealthy).mockResolvedValue(true);
    vi.mocked(ErrorHandler.withErrorHandling).mockImplementation((fn: any) =>
      fn()
    );
    vi.mocked(Parser).mockResolvedValue({});
    vi.mocked(prisma.parsedIngredientLine.update).mockResolvedValue({
      id: "line-1",
      createdAt: new Date(),
      updatedAt: new Date(),
      blockIndex: 0,
      lineIndex: 0,
      reference: "test",
      rule: null,
      parseStatus: "PARSED" as any,
      parsedAt: new Date(),
      noteId: "note-id",
    });
    vi.mocked(prisma.note.update).mockResolvedValue({
      id: "note-id",
      title: "Test Note",
      html: "<html></html>",
      imageUrl: null,
      status: "PROCESSING" as any,
      evernoteMetadataId: null,
      totalIngredientLines: 0,
      totalInstructionLines: 0,
      parsingErrorCount: 0,
      errorMessage: null,
      errorCode: null,
      errorDetails: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    vi.mocked(addStatusEventAndBroadcast).mockResolvedValue({
      id: "status-1",
      createdAt: new Date(),
      status: "COMPLETED" as any,
      errorMessage: null,
      errorCode: null,
      errorDetails: {},
      noteId: "note-id",
      context: null,
      currentCount: null,
      totalCount: null,
    });
    vi.mocked(ErrorHandler.createJobError).mockImplementation(
      (error, type, severity, meta) => ({
        type: type || ErrorType.UNKNOWN_ERROR,
        severity: severity || ErrorSeverity.CRITICAL,
        message: typeof error === "string" ? error : error.message,
        timestamp: new Date(),
        jobId: "",
        queueName: "",
        retryCount: 0,
        ...meta,
      })
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("processIngredientJob", () => {
    it("should process ingredient job successfully", async () => {
      await expect(
        processIngredientJob(mockJob, mockQueue)
      ).resolves.toBeUndefined();

      expect(mockConsoleLog).toHaveBeenCalledWith(
        "Processing ingredient job job-id (attempt 1)"
      );
      expect(mockConsoleLog).toHaveBeenCalledWith(
        "Ingredient processing job job-id completed successfully"
      );
    });

    it("should handle validation error", async () => {
      const { ErrorHandler } = await import(
        "../../../../src/utils/error-handler"
      );
      const validationError = {
        message: "Invalid job data",
        type: ErrorType.VALIDATION_ERROR,
        severity: ErrorSeverity.MEDIUM,
        timestamp: new Date(),
      };
      vi.mocked(ErrorHandler.validateJobData).mockReturnValue(
        validationError as any
      );

      await expect(
        processIngredientJob(mockJob, mockQueue)
      ).rejects.toBeInstanceOf(QueueError);

      expect(ErrorHandler.logError).toHaveBeenCalledWith(
        expect.objectContaining({
          jobId: "job-id",
          queueName: "test-ingredient-queue",
          retryCount: 0,
        })
      );
    });

    it("should handle unhealthy service", async () => {
      // Override HealthMonitor to return unhealthy
      const { HealthMonitor } = await import(
        "../../../../src/utils/health-monitor"
      );
      vi.spyOn(HealthMonitor, "getInstance").mockReturnValue({
        isHealthy: vi.fn(async () => false),
      } as any);
      const { ErrorHandler } = await import(
        "../../../../src/utils/error-handler"
      );

      await expect(
        processIngredientJob(mockJob, mockQueue)
      ).rejects.toBeInstanceOf(QueueError);
      expect(ErrorHandler.logError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Service is unhealthy, skipping ingredient processing",
          type: ErrorType.EXTERNAL_SERVICE_ERROR,
          severity: ErrorSeverity.HIGH,
        })
      );
    });

    it("should handle DB update error in batch", async () => {
      const { ErrorHandler, QueueError } = await import(
        "../../../../src/utils/error-handler"
      );
      // Use a counter to track calls and throw on the DB update call
      let callCount = 0;
      vi.mocked(ErrorHandler.withErrorHandling).mockImplementation(
        (fn: any) => {
          callCount++;
          // The first 3 calls are for parsing (one per line), the next 3 are for DB updates
          if (callCount >= 4 && callCount <= 6) {
            throw new QueueError({
              message: "db fail",
              type: ErrorType.DATABASE_ERROR,
              severity: ErrorSeverity.HIGH,
              timestamp: new Date(),
            });
          }
          return fn();
        }
      );

      await expect(
        processIngredientJob(mockJob, mockQueue)
      ).rejects.toBeInstanceOf(QueueError);
      expect(ErrorHandler.logError).toHaveBeenCalled();
    });

    it("should handle error in status event", async () => {
      const { HealthMonitor } = await import(
        "../../../../src/utils/health-monitor"
      );
      const { ErrorHandler, QueueError } = await import(
        "../../../../src/utils/error-handler"
      );
      vi.mocked(HealthMonitor.getInstance().isHealthy).mockResolvedValue(true);
      // Use a counter to track calls and throw on the status event call
      let callCount = 0;
      vi.mocked(ErrorHandler.withErrorHandling).mockImplementation(
        (fn: any) => {
          callCount++;
          // The status event call happens after all the parsing and DB updates
          if (callCount === 7) {
            throw new QueueError({
              message: "status fail",
              type: ErrorType.UNKNOWN_ERROR,
              severity: ErrorSeverity.HIGH,
              timestamp: new Date(),
            });
          }
          return fn();
        }
      );

      await expect(
        processIngredientJob(mockJob, mockQueue)
      ).rejects.toBeInstanceOf(QueueError);
      expect(ErrorHandler.logError).toHaveBeenCalled();
    });

    it("should handle structured QueueError and retry", async () => {
      const { ErrorHandler } = await import(
        "../../../../src/utils/error-handler"
      );
      vi.mocked(ErrorHandler.shouldRetry).mockReturnValue(true);
      vi.mocked(ErrorHandler.withErrorHandling).mockImplementation(() => {
        throw new QueueError({
          message: "fail",
          type: ErrorType.DATABASE_ERROR,
          severity: ErrorSeverity.HIGH,
          timestamp: new Date(),
        });
      });

      await expect(
        processIngredientJob(mockJob, mockQueue)
      ).rejects.toBeInstanceOf(QueueError);
      expect(ErrorHandler.logError).toHaveBeenCalled();
    });

    it("should handle structured QueueError and not retry", async () => {
      const { ErrorHandler } = await import(
        "../../../../src/utils/error-handler"
      );
      vi.mocked(ErrorHandler.shouldRetry).mockReturnValue(false);
      vi.mocked(ErrorHandler.withErrorHandling).mockImplementation(() => {
        throw new QueueError({
          message: "fail",
          type: ErrorType.DATABASE_ERROR,
          severity: ErrorSeverity.HIGH,
          timestamp: new Date(),
        });
      });

      await expect(
        processIngredientJob(mockJob, mockQueue)
      ).rejects.toBeInstanceOf(QueueError);
      expect(ErrorHandler.logError).toHaveBeenCalled();
    });

    it("should handle unexpected errors", async () => {
      const { ErrorHandler } = await import(
        "../../../../src/utils/error-handler"
      );
      vi.mocked(ErrorHandler.withErrorHandling).mockImplementation(() => {
        throw new Error("unexpected");
      });
      vi.mocked(ErrorHandler.classifyError).mockReturnValue({
        message: "classified",
        type: ErrorType.UNKNOWN_ERROR,
        severity: ErrorSeverity.HIGH,
        timestamp: new Date(),
      });

      await expect(
        processIngredientJob(mockJob, mockQueue)
      ).rejects.toBeInstanceOf(QueueError);
      expect(ErrorHandler.logError).toHaveBeenCalled();
    });

    it("should handle batch DB update error (batch error coverage)", async () => {
      const { ErrorHandler } = await import(
        "../../../../src/utils/error-handler"
      );
      const { prisma } = await import("@peas/database");
      // 11 lines to trigger batch
      const manyLines = Array.from({ length: 11 }, (_, i) => ({
        id: `line-${i}`,
        reference: `ingredient ${i}`,
      }));
      const job = {
        ...mockJob,
        data: {
          note: {
            id: "note-id",
            parsedIngredientLines: manyLines,
          },
        },
      } as Job;
      // Mock update: reject for line-9 (10th line, triggers batch error block)
      vi.mocked(prisma.parsedIngredientLine.update).mockImplementation(
        ({ where }: any) => {
          if (where.id === "line-9")
            return Promise.reject(new Error("batch fail"));
          return Promise.resolve(undefined) as any;
        }
      );
      // Mock withErrorHandling to preserve the original error context
      vi.mocked(ErrorHandler.withErrorHandling).mockImplementation(
        async (fn: any, meta: any) => {
          try {
            return await fn();
          } catch (error) {
            const jobError = ErrorHandler.createJobError(
              error as Error,
              ErrorType.DATABASE_ERROR,
              ErrorSeverity.MEDIUM,
              meta
            );
            // Ensure the message is preserved at both top level and in context
            jobError.message = (error as Error).message;
            jobError.context = {
              ...jobError.context,
              message: (error as Error).message,
            };
            ErrorHandler.logError(jobError);
            throw new QueueError(jobError);
          }
        }
      );
      await expect(
        processIngredientJob(job, mockQueue)
      ).resolves.toBeUndefined();
      // Check that logError was called at least once with the batch error
      const logCalls = (ErrorHandler.logError as any).mock.calls.map(
        (call: any[]) => call[0]
      );
      expect(
        logCalls.some(
          (call: any) =>
            call &&
            call.operation === "update_ingredient_line" &&
            call.message === "batch fail"
        )
      ).toBe(true);
    });

    it("should handle parse error and errorCount > 0 (completion error branch)", async () => {
      const { ErrorHandler } = await import(
        "../../../../src/utils/error-handler"
      );
      // Force parse error on first line
      vi.mocked(ErrorHandler.withErrorHandling)
        .mockImplementationOnce(() => {
          throw new Error("parse fail");
        })
        .mockImplementation((fn: any) => fn());
      await expect(
        processIngredientJob(mockJob, mockQueue)
      ).resolves.toBeUndefined();
      expect(ErrorHandler.logError).toHaveBeenCalled();
    });

    it("should handle failure to add status event in error handler (status event catch branch)", async () => {
      const { ErrorHandler } = await import(
        "../../../../src/utils/error-handler"
      );
      // Throw a QueueError to enter the error handler
      vi.mocked(ErrorHandler.withErrorHandling).mockImplementation(() => {
        throw new QueueError({
          message: "fail",
          type: ErrorType.DATABASE_ERROR,
          severity: ErrorSeverity.HIGH,
          timestamp: new Date(),
        });
      });
      // Throw in addStatusEventAndBroadcast to hit the catch
      const { addStatusEventAndBroadcast } = await import(
        "../../../../src/utils/status-broadcaster"
      );
      vi.mocked(addStatusEventAndBroadcast).mockImplementation(() => {
        throw new Error("status event fail");
      });
      // Spy on console.error
      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      await expect(
        processIngredientJob(mockJob, mockQueue)
      ).rejects.toBeInstanceOf(QueueError);
      expect(errorSpy).toHaveBeenCalledWith(
        "Failed to add failure status event:",
        expect.any(Error)
      );
      errorSpy.mockRestore();
    });
  });
});
