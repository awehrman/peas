import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { QueueError } from "../../utils";
import { ErrorType, ErrorSeverity } from "../../types";
import * as ErrorHandler from "../../utils/error-handler";

// Mocks for dependencies
const mockPrisma = {
  parsedInstructionLine: {
    update: vi.fn(),
  },
};
const mockAddStatusEventAndBroadcast = vi.fn();
const mockWithErrorHandling = vi.fn();
const mockValidateJobData = vi.fn();
const mockLogError = vi.fn();
const mockShouldRetry = vi.fn();
const mockCalculateBackoff = vi.fn();
const mockCreateJobError = vi.fn();
const mockClassifyError = vi.fn();

vi.mock("@peas/database", () => ({
  prisma: mockPrisma,
}));
vi.mock("../../utils/status-broadcaster", () => ({
  addStatusEventAndBroadcast: mockAddStatusEventAndBroadcast,
}));

const mockHealthMonitor = {
  isHealthy: vi.fn(),
};
vi.mock("../../utils/health-monitor", () => ({
  HealthMonitor: { getInstance: () => mockHealthMonitor },
}));

vi.doMock("../../utils", async () => {
  const actual = await vi.importActual("../../utils");
  return {
    ...actual,
    ErrorHandler: {
      validateJobData: mockValidateJobData,
      logError: mockLogError,
      withErrorHandling: mockWithErrorHandling,
      shouldRetry: mockShouldRetry,
      calculateBackoff: mockCalculateBackoff,
      createJobError: mockCreateJobError,
      classifyError: mockClassifyError,
    },
    // Do NOT redefine QueueError here!
  };
});

// --- Mock BullMQ Worker ---
let capturedProcessFn: ((job: any) => Promise<any>) | null = null;
let capturedListeners: Record<string, Array<(...args: any[]) => any>> = {};

vi.mock("bullmq", () => {
  return {
    Worker: class MockWorker {
      static lastInstance: any;
      name: string;
      opts: any;
      constructor(
        name: string,
        processFn: (job: any) => Promise<any>,
        opts: any
      ) {
        this.name = name;
        this.opts = opts;
        capturedProcessFn = processFn;
        capturedListeners = {};
        MockWorker.lastInstance = this;
      }
      on(event: string, listener: (...args: any[]) => any) {
        if (!capturedListeners[event]) capturedListeners[event] = [];
        capturedListeners[event].push(listener);
        return this;
      }
    },
    Queue: class {},
  };
});
// --- End BullMQ Worker mock ---

describe("setupInstructionWorker", () => {
  let setupInstructionWorker: any;
  let queue: any;
  let job: any;
  let originalConsoleLog: any;
  let originalConsoleError: any;
  let logSpy: any;
  let errorSpy: any;

  beforeEach(async () => {
    logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const module = await import("../../workers/instruction");
    setupInstructionWorker = module.setupInstructionWorker;
    queue = { name: "instruction-queue" };
    job = {
      id: "job1",
      attemptsMade: 0,
      data: {
        note: {
          id: 1,
          parsedInstructionLines: [
            { id: 101, originalText: "Step 1" },
            { id: 102, originalText: "Step 2" },
          ],
        },
      },
    };
    vi.clearAllMocks();
    mockHealthMonitor.isHealthy.mockResolvedValue(true);
    mockValidateJobData.mockReturnValue(null);
    mockWithErrorHandling.mockImplementation((fn) => fn());
    mockPrisma.parsedInstructionLine.update.mockResolvedValue({});
    mockAddStatusEventAndBroadcast.mockResolvedValue(undefined);
    mockShouldRetry.mockReturnValue(false);
    mockCalculateBackoff.mockReturnValue(1000);
    mockCreateJobError.mockImplementation((error, type, severity, context) => {
      const message = typeof error === "string" ? error : error.message;
      return {
        message,
        type,
        severity,
        context,
        timestamp: new Date(),
      };
    });
    mockClassifyError.mockImplementation((err) => ({
      message: err.message,
      type: ErrorType.UNKNOWN_ERROR,
      severity: ErrorSeverity.CRITICAL,
    }));
    originalConsoleLog = console.log;
    originalConsoleError = console.error;
  });

  afterEach(() => {
    logSpy.mockRestore();
    errorSpy.mockRestore();
    console.log = originalConsoleLog;
    console.error = originalConsoleError;
    capturedProcessFn = null;
    capturedListeners = {};
  });

  it("should process all instruction lines successfully", async () => {
    const validateSpy = vi.spyOn(ErrorHandler, "validateJobData");
    setupInstructionWorker(queue);
    await expect(capturedProcessFn?.(job)).resolves.toBeUndefined();
    expect(validateSpy).toHaveBeenCalled();
    expect(mockHealthMonitor.isHealthy).toHaveBeenCalled();
    expect(mockWithErrorHandling).toHaveBeenCalled();
    validateSpy.mockRestore();
  });

  it("should handle job validation error (validation object)", async () => {
    // Mock ErrorHandler.validateJobData to return a validation error object
    const validationError = {
      message: "Invalid data",
      type: ErrorType.UNKNOWN_ERROR,
      severity: ErrorSeverity.MEDIUM,
      timestamp: new Date(),
    };
    const validateSpy = vi
      .spyOn(ErrorHandler as any, "validateJobData")
      .mockReturnValue(validationError);
    setupInstructionWorker(queue);
    await expect(capturedProcessFn?.(job)).rejects.toThrow(QueueError);
    expect(mockLogError).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Invalid data" })
    );
    validateSpy.mockRestore();
  });

  it("should handle parsing errors for some lines and log to console.error", async () => {
    let call = 0;
    mockWithErrorHandling.mockImplementation((fn) => {
      if (call === 0) {
        call++;
        throw new Error("parse fail");
      }
      return fn();
    });
    const errorSpy = vi.spyOn(console, "error");
    setupInstructionWorker(queue);
    await expect(capturedProcessFn?.(job)).resolves.toBeUndefined();
    expect(mockLogError).toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining("❌ Failed to parse instruction")
    );
    errorSpy.mockRestore();
  });

  it("should handle unhealthy service", async () => {
    mockHealthMonitor.isHealthy.mockResolvedValue(false);
    setupInstructionWorker(queue);
    await expect(capturedProcessFn?.(job)).rejects.toThrow(
      "Service is unhealthy, skipping instruction processing"
    );
    expect(mockLogError).toHaveBeenCalled();
  });

  it("should handle job validation error", async () => {
    job.data.note = null;
    setupInstructionWorker(queue);
    await expect(capturedProcessFn?.(job)).rejects.toThrow(
      "Invalid job data: missing note"
    );
  });

  it("should handle batch DB update error", async () => {
    // Mock the prisma update to throw an error
    mockPrisma.parsedInstructionLine.update.mockRejectedValueOnce(
      new Error("db fail")
    );
    setupInstructionWorker(queue);
    await expect(capturedProcessFn?.(job)).rejects.toThrow(QueueError);
    expect(mockLogError).toHaveBeenCalled();
  });

  it("should handle error in status event", async () => {
    // Mock the status broadcaster to throw an error
    mockAddStatusEventAndBroadcast.mockRejectedValueOnce(
      new Error("status fail")
    );
    setupInstructionWorker(queue);
    await expect(capturedProcessFn?.(job)).rejects.toThrow(QueueError);
    expect(mockLogError).toHaveBeenCalled();
  });

  it("should handle structured QueueError and retry", async () => {
    mockShouldRetry.mockReturnValue(true);
    mockCalculateBackoff.mockReturnValue(2000);
    const error = new QueueError({
      message: "retry me",
      type: ErrorType.UNKNOWN_ERROR,
      severity: ErrorSeverity.MEDIUM,
      timestamp: new Date(),
    });
    mockWithErrorHandling
      .mockImplementationOnce((fn) => fn()) // parseInstruction
      .mockImplementationOnce((fn) => fn()) // update
      .mockImplementationOnce((fn) => fn()) // status event
      .mockImplementationOnce(() => {
        throw error;
      }); // final batch
    setupInstructionWorker(queue);
    await expect(capturedProcessFn?.(job)).rejects.toThrow("retry me");
    await new Promise((r) => setTimeout(r, 0));
    const logCalls = logSpy.mock.calls.flat();
    expect(
      logCalls.some(
        (msg: any) =>
          typeof msg === "string" &&
          msg.includes("Scheduling retry for instruction job job1 in 2000ms")
      )
    ).toBe(true);
  });

  it("should handle structured QueueError and not retry", async () => {
    mockShouldRetry.mockReturnValue(false);
    const error = new QueueError({
      message: "fail permanently",
      type: ErrorType.UNKNOWN_ERROR,
      severity: ErrorSeverity.MEDIUM,
      timestamp: new Date(),
    });
    mockWithErrorHandling
      .mockImplementationOnce((fn) => fn()) // parseInstruction
      .mockImplementationOnce((fn) => fn()) // update
      .mockImplementationOnce((fn) => fn()) // status event
      .mockImplementationOnce(() => {
        throw error;
      }); // final batch
    setupInstructionWorker(queue);
    await expect(capturedProcessFn?.(job)).rejects.toThrow("fail permanently");
    await new Promise((r) => setTimeout(r, 0));
    const logCalls = logSpy.mock.calls.flat();
    expect(
      logCalls.some(
        (msg: any) =>
          typeof msg === "string" &&
          msg.includes(
            "Instruction job job1 failed permanently after 1 attempts"
          )
      )
    ).toBe(true);
  });

  it("should handle unexpected error", async () => {
    mockWithErrorHandling.mockImplementation(() => {
      throw new Error("unexpected");
    });
    setupInstructionWorker(queue);
    await expect(capturedProcessFn?.(job)).rejects.toThrow("unexpected");
    expect(mockLogError).toHaveBeenCalled();
  });

  it("should call completed event listener", () => {
    setupInstructionWorker(queue);
    const completedListener = capturedListeners["completed"]?.[0];
    expect(completedListener).toBeDefined();
    completedListener!({ id: "job1" });
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining("completed"));
  });

  it("should call failed event listener with QueueError", () => {
    setupInstructionWorker(queue);
    const failedListener = capturedListeners["failed"]?.[0];
    expect(failedListener).toBeDefined();
    const error = new QueueError({
      message: "fail",
      type: ErrorType.UNKNOWN_ERROR,
      severity: ErrorSeverity.MEDIUM,
      timestamp: new Date(),
    });
    failedListener?.({ id: "job1" }, error);
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining("failed:"),
      "fail"
    );
  });

  it("should call failed event listener with generic error", () => {
    setupInstructionWorker(queue);
    const failedListener = capturedListeners["failed"]?.[0];
    expect(failedListener).toBeDefined();
    failedListener?.({ id: "job1" }, new Error("fail"));
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining("failed:"),
      "fail"
    );
  });

  it("should call error event listener", () => {
    setupInstructionWorker(queue);
    const errorListener = capturedListeners["error"]?.[0];
    expect(errorListener).toBeDefined();
    errorListener?.(new Error("err"));
    expect(mockCreateJobError).toHaveBeenCalled();
    expect(mockLogError).toHaveBeenCalled();
  });

  it("should handle batch DB update error in batch", async () => {
    // Exactly 10 lines to trigger batch (BATCH_SIZE = 10)
    job.data.note.parsedInstructionLines = Array.from(
      { length: 10 },
      (_, i) => ({
        id: 100 + i,
        originalText: `Step ${i + 1}`,
      })
    );

    let callCount = 0;
    mockPrisma.parsedInstructionLine.update.mockImplementation(() => {
      callCount++;
      // Fail on the 10th call (which should trigger the batch error handling)
      if (callCount === 10) {
        return Promise.reject(new Error("batch fail"));
      }
      return Promise.resolve({});
    });

    setupInstructionWorker(queue);
    // The batch error is caught and handled gracefully, so job should resolve
    await expect(capturedProcessFn?.(job)).resolves.toBeUndefined();

    // Should log the batch error
    expect(
      mockLogError.mock.calls.some(
        ([arg]) => arg && arg.message === "batch fail"
      )
    ).toBe(true);
  });

  it("should handle failure status event error in catch block", async () => {
    // Simulate a QueueError and make addStatusEventAndBroadcast throw
    const error = new QueueError({
      message: "fail",
      type: ErrorType.UNKNOWN_ERROR,
      severity: ErrorSeverity.MEDIUM,
      timestamp: new Date(),
    });
    mockWithErrorHandling.mockImplementation(() => {
      throw error;
    });
    mockShouldRetry.mockReturnValue(false);
    mockAddStatusEventAndBroadcast.mockRejectedValueOnce(
      new Error("status event fail")
    );
    setupInstructionWorker(queue);
    await expect(capturedProcessFn?.(job)).rejects.toThrow("fail");
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining("Failed to add failure status event"),
      expect.any(Error)
    );
  });
});
