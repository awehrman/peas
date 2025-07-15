import { describe, it, expect, vi, beforeEach } from "vitest";
import { processInstructionJob } from "../../../../src/workers/instructions/job-orchestrator";
import { Queue } from "bullmq";
import { InstructionWorkerDependencies } from "../../../../src/workers/instructions/types";
import { QueueError } from "../../../../src/utils/error-handler";
import { ErrorType, ErrorSeverity } from "../../../../src/types";

// Mock the database
vi.mock("@peas/database", () => ({
  PrismaClient: vi.fn().mockImplementation(() => ({
    parsedInstructionLine: {
      update: vi.fn(),
    },
    $disconnect: vi.fn(),
  })),
  prisma: {
    parsedInstructionLine: {
      update: vi.fn(),
    },
    $disconnect: vi.fn(),
  },
}));

// Mock the status broadcaster
vi.mock("../../../../src/utils/status-broadcaster", () => ({
  addStatusEventAndBroadcast: vi.fn(),
}));

// Mock the error handler
vi.mock("../../../../src/utils/error-handler", async () => {
  const actual = await import("../../../../src/utils/error-handler");
  return {
    ...actual,
    validateJobData: vi.fn(),
    ErrorHandler: {
      ...actual.ErrorHandler,
      logError: vi.fn(),
      createJobError: vi.fn((err, type, severity, meta) => ({
        ...(typeof err === "object" ? err : { message: err }),
        type,
        severity,
        ...meta,
      })),
      shouldRetry: vi.fn(() => false),
      calculateBackoff: vi.fn(() => 1000),
      classifyError: vi.fn((err) => err),
      withErrorHandling: vi.fn((fn) => fn()),
    },
  };
});

// Mock the health monitor to always return healthy by default
vi.mock("../../../../src/utils/health-monitor", async () => {
  const actual = await import("../../../../src/utils/health-monitor");
  return {
    ...actual,
    HealthMonitor: {
      ...actual.HealthMonitor,
      getInstance: () => ({
        isHealthy: vi.fn(() => true),
      }),
    },
  };
});

const mockQueue = { name: "test-instruction-queue" } as unknown as Queue;
const mockJob = (overrides: any = {}) => ({
  id: "job-id",
  attemptsMade: 0,
  data: {
    note: {
      id: "note-id",
      parsedInstructionLines: [{ id: "line-id", originalText: "step 1" }],
    },
  },
  ...overrides,
});

const mockLogger = { log: vi.fn(), error: vi.fn() };
const mockAddStatusEventAndBroadcast = vi.fn();
const mockHealthMonitor = {
  getInstance: () => ({ isHealthy: vi.fn(() => true) }),
};
const mockParseHTML = vi.fn();
const mockCreateNote = vi.fn();

function getDeps(
  overrides: Partial<InstructionWorkerDependencies> = {}
): InstructionWorkerDependencies {
  return {
    parseHTML: mockParseHTML,
    createNote: mockCreateNote,
    addStatusEventAndBroadcast: mockAddStatusEventAndBroadcast,
    ErrorHandler: {} as any, // Will be mocked at module level
    HealthMonitor: mockHealthMonitor as any,
    logger: mockLogger,
    ingredientQueue: {} as Queue,
    instructionQueue: {} as Queue,
    imageQueue: {} as Queue,
    categorizationQueue: {} as Queue,
    ...overrides,
  };
}

describe("processInstructionJob", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    // Reset health monitor to healthy by default
    const { HealthMonitor } = await import(
      "../../../../src/utils/health-monitor"
    );
    vi.spyOn(HealthMonitor, "getInstance").mockReturnValue({
      isHealthy: vi.fn(() => true),
    } as any);
  });

  it("should process instruction job successfully", async () => {
    await expect(
      processInstructionJob(mockJob(), mockQueue, getDeps())
    ).resolves.toBeUndefined();
  });

  it("should handle validation error", async () => {
    const { validateJobData, ErrorHandler } = await import(
      "../../../../src/utils/error-handler"
    );
    vi.mocked(validateJobData).mockReturnValueOnce({
      message: "validation error",
      type: ErrorType.VALIDATION_ERROR,
      severity: ErrorSeverity.MEDIUM,
      timestamp: new Date(),
    });

    await expect(
      processInstructionJob(mockJob(), mockQueue, getDeps())
    ).rejects.toBeDefined();
    expect(ErrorHandler.logError).toHaveBeenCalled();
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
      processInstructionJob(mockJob(), mockQueue, getDeps())
    ).rejects.toBeDefined();
    expect(ErrorHandler.logError).toHaveBeenCalled();
  });

  it("should handle DB update error in batch", async () => {
    const { ErrorHandler } = await import(
      "../../../../src/utils/error-handler"
    );
    vi.mocked(ErrorHandler.withErrorHandling)
      .mockImplementationOnce((fn) => fn()) // parser
      .mockImplementationOnce(() => {
        throw new Error("db fail");
      }); // DB update

    await expect(
      processInstructionJob(mockJob(), mockQueue, getDeps())
    ).rejects.toBeInstanceOf(QueueError);
    expect(ErrorHandler.logError).toHaveBeenCalled();
  });

  it("should handle error in status event", async () => {
    const { ErrorHandler } = await import(
      "../../../../src/utils/error-handler"
    );
    vi.mocked(ErrorHandler.withErrorHandling)
      .mockImplementationOnce((fn) => fn()) // parser
      .mockImplementationOnce((fn) => fn()) // DB update
      .mockImplementationOnce(() => {
        throw new Error("status fail");
      }); // status event

    await expect(
      processInstructionJob(mockJob(), mockQueue, getDeps())
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
      processInstructionJob(mockJob(), mockQueue, getDeps())
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
      processInstructionJob(mockJob(), mockQueue, getDeps())
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
      processInstructionJob(mockJob(), mockQueue, getDeps())
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
      originalText: `step ${i}`,
    }));
    const job = mockJob({
      data: {
        note: {
          id: "note-id",
          parsedInstructionLines: manyLines,
        },
      },
    });
    // Mock update: reject for line-9 (10th line, triggers batch error block)
    vi.mocked(prisma.parsedInstructionLine.update).mockImplementation(
      ({ where }) => {
        if (where.id === "line-9")
          return Promise.reject(new Error("batch fail"));
        return Promise.resolve(undefined) as any;
      }
    );
    // Mock withErrorHandling to preserve the original error context
    vi.mocked(ErrorHandler.withErrorHandling).mockImplementation(
      async (fn, meta) => {
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
          console.log(
            "jobError before logError:",
            JSON.stringify(jobError, null, 2)
          );
          ErrorHandler.logError(jobError);
          throw new QueueError(jobError);
        }
      }
    );
    await expect(
      processInstructionJob(job, mockQueue, getDeps())
    ).resolves.toBeUndefined();
    // Check that logError was called at least once with the batch error
    const logCalls = (ErrorHandler.logError as any).mock.calls.map(
      (call: any[]) => call[0]
    );
    console.log("logError calls:", JSON.stringify(logCalls, null, 2));
    expect(
      logCalls.some(
        (call: any) =>
          call &&
          call.operation === "update_instruction_line" &&
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
      .mockImplementation((fn) => fn());
    await expect(
      processInstructionJob(mockJob(), mockQueue, getDeps())
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
      processInstructionJob(mockJob(), mockQueue, getDeps())
    ).rejects.toBeInstanceOf(QueueError);
    expect(errorSpy).toHaveBeenCalledWith(
      "Failed to add failure status event:",
      expect.any(Error)
    );
    errorSpy.mockRestore();
  });
});
