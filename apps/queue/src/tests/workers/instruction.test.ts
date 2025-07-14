import { vi } from "vitest";

// Import mock functions first so they can be used in the mock
import {
  mockWithErrorHandling,
  mockLogError,
  mockShouldRetry,
  mockCalculateBackoff,
  mockCreateJobError,
  mockClassifyError,
  mockValidateJobData,
} from "../utils/worker-test-utils";

// Mock error-handler before any other imports to ensure it's in place
vi.mock("../../utils/error-handler", () => {
  class QueueErrorMock extends Error {
    public readonly jobError: any;
    constructor(jobError: any) {
      super(jobError.message);
      this.name = "QueueError";
      this.jobError = jobError;
    }
  }

  class ErrorHandlerMock {
    static withErrorHandling = mockWithErrorHandling;
    static logError = mockLogError;
    static shouldRetry = mockShouldRetry;
    static calculateBackoff = mockCalculateBackoff;
    static createJobError = mockCreateJobError;
    static classifyError = mockClassifyError;
    static validateJobData = mockValidateJobData;
  }

  return {
    ErrorHandler: ErrorHandlerMock,
    QueueError: QueueErrorMock,
  };
});

// Mock utils barrel export to include QueueError
vi.mock("../../utils", () => {
  class QueueErrorMock extends Error {
    public readonly jobError: any;
    constructor(jobError: any) {
      super(jobError.message);
      this.name = "QueueError";
      this.jobError = jobError;
    }
  }

  class ErrorHandlerMock {
    static withErrorHandling = mockWithErrorHandling;
    static logError = mockLogError;
    static shouldRetry = mockShouldRetry;
    static calculateBackoff = mockCalculateBackoff;
    static createJobError = mockCreateJobError;
    static classifyError = mockClassifyError;
    static validateJobData = mockValidateJobData;
  }

  return {
    QueueError: QueueErrorMock,
    ErrorHandler: ErrorHandlerMock,
  };
});

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { QueueError } from "../../utils";
import { ErrorType, ErrorSeverity } from "../../types";
import {
  setupWorkerTestEnvironment,
  cleanupWorkerTestEnvironment,
  capturedProcessFn,
  capturedListeners,
  mockAddStatusEventAndBroadcast,
  mockHealthMonitor,
  mockPrisma,
} from "../utils/worker-test-utils";

describe("setupInstructionWorker", () => {
  let setupInstructionWorker: any;
  let testSetup: any;

  beforeEach(async () => {
    console.log("🧪 Setting up test environment...");

    testSetup = setupWorkerTestEnvironment();

    const module = await import("../../workers/instruction");
    setupInstructionWorker = module.setupInstructionWorker;

    // Setup instruction-specific job data
    testSetup.job = {
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

    // Setup instruction-specific mocks
    mockPrisma.parsedInstructionLine.update.mockResolvedValue({});
    mockAddStatusEventAndBroadcast.mockResolvedValue(undefined);
  });

  afterEach(() => {
    console.log("🧹 Cleaning up test environment...");
    cleanupWorkerTestEnvironment(testSetup);
  });

  it("should process all instruction lines successfully", async () => {
    setupInstructionWorker(testSetup.queue);
    await expect(capturedProcessFn?.(testSetup.job)).resolves.toBeUndefined();
    expect(mockValidateJobData).toHaveBeenCalled();
    expect(mockHealthMonitor.isHealthy).toHaveBeenCalled();
    expect(mockWithErrorHandling).toHaveBeenCalled();
  });

  it("should handle job validation error (validation object)", async () => {
    const validationError = {
      message: "Invalid data",
      type: ErrorType.UNKNOWN_ERROR,
      severity: ErrorSeverity.MEDIUM,
      timestamp: new Date(),
    };
    mockValidateJobData.mockReturnValue(validationError);
    setupInstructionWorker(testSetup.queue);
    await expect(capturedProcessFn?.(testSetup.job)).rejects.toThrow(
      QueueError
    );
    expect(mockLogError).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Invalid data" })
    );
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
    setupInstructionWorker(testSetup.queue);
    await expect(capturedProcessFn?.(testSetup.job)).resolves.toBeUndefined();
    expect(mockLogError).toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining("❌ Failed to parse instruction")
    );
    errorSpy.mockRestore();
  });

  it("should handle unhealthy service", async () => {
    mockHealthMonitor.isHealthy.mockResolvedValue(false);
    setupInstructionWorker(testSetup.queue);
    await expect(capturedProcessFn?.(testSetup.job)).rejects.toThrow(
      "Service is unhealthy, skipping instruction processing"
    );
    expect(mockLogError).toHaveBeenCalled();
  });

  it("should handle job validation error", async () => {
    testSetup.job.data.note = null;
    // Mock validation to return error when note is null
    mockValidateJobData.mockReturnValue({
      message: "Invalid job data: missing note",
      type: ErrorType.UNKNOWN_ERROR,
      severity: ErrorSeverity.MEDIUM,
      timestamp: new Date(),
    });
    setupInstructionWorker(testSetup.queue);
    await expect(capturedProcessFn?.(testSetup.job)).rejects.toThrow(
      "Invalid job data: missing note"
    );
  });

  it("should handle batch DB update error", async () => {
    mockPrisma.parsedInstructionLine.update.mockRejectedValueOnce(
      new Error("db fail")
    );
    setupInstructionWorker(testSetup.queue);
    await expect(capturedProcessFn?.(testSetup.job)).rejects.toThrow(
      QueueError
    );
    expect(mockLogError).toHaveBeenCalled();
  });

  it("should handle error in status event", async () => {
    mockAddStatusEventAndBroadcast.mockRejectedValueOnce(
      new Error("status fail")
    );
    setupInstructionWorker(testSetup.queue);
    await expect(capturedProcessFn?.(testSetup.job)).rejects.toThrow(
      QueueError
    );
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
    setupInstructionWorker(testSetup.queue);
    await expect(capturedProcessFn?.(testSetup.job)).rejects.toThrow(
      "retry me"
    );
    await new Promise((r) => setTimeout(r, 0));
    const logCalls = testSetup.logSpy.mock.calls.flat();
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
    setupInstructionWorker(testSetup.queue);
    await expect(capturedProcessFn?.(testSetup.job)).rejects.toThrow(
      "fail permanently"
    );
    await new Promise((r) => setTimeout(r, 0));
    const logCalls = testSetup.logSpy.mock.calls.flat();
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
    setupInstructionWorker(testSetup.queue);
    await expect(capturedProcessFn?.(testSetup.job)).rejects.toThrow(
      "unexpected"
    );
    expect(mockLogError).toHaveBeenCalled();
  });

  it("should call completed event listener", () => {
    setupInstructionWorker(testSetup.queue);
    const completedListener = capturedListeners["completed"]?.[0];
    expect(completedListener).toBeDefined();
    completedListener!({ id: "job1" });
    expect(testSetup.logSpy).toHaveBeenCalledWith(
      expect.stringContaining("completed")
    );
  });

  it("should call failed event listener with QueueError", () => {
    setupInstructionWorker(testSetup.queue);
    const failedListener = capturedListeners["failed"]?.[0];
    expect(failedListener).toBeDefined();
    const error = new QueueError({
      message: "fail",
      type: ErrorType.UNKNOWN_ERROR,
      severity: ErrorSeverity.MEDIUM,
      timestamp: new Date(),
    });
    failedListener?.({ id: "job1" }, error);
    expect(testSetup.errorSpy).toHaveBeenCalledWith(
      expect.stringContaining("failed:"),
      "fail"
    );
  });

  it("should call failed event listener with generic error", () => {
    setupInstructionWorker(testSetup.queue);
    const failedListener = capturedListeners["failed"]?.[0];
    expect(failedListener).toBeDefined();
    failedListener?.({ id: "job1" }, new Error("fail"));
    expect(testSetup.errorSpy).toHaveBeenCalledWith(
      expect.stringContaining("failed:"),
      "fail"
    );
  });

  it("should call error event listener", () => {
    setupInstructionWorker(testSetup.queue);
    const errorListener = capturedListeners["error"]?.[0];
    expect(errorListener).toBeDefined();
    errorListener?.(new Error("err"));
    expect(mockCreateJobError).toHaveBeenCalled();
    expect(mockLogError).toHaveBeenCalled();
  });

  it("should handle batch DB update error in batch", async () => {
    // Exactly 10 lines to trigger batch (BATCH_SIZE = 10)
    testSetup.job.data.note.parsedInstructionLines = Array.from(
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

    setupInstructionWorker(testSetup.queue);
    // The batch error is caught and handled gracefully, so job should resolve
    await expect(capturedProcessFn?.(testSetup.job)).resolves.toBeUndefined();

    // Should log the batch error
    expect(
      mockLogError.mock.calls.some(
        ([arg]) => arg && arg.message === "batch fail"
      )
    ).toBe(true);
  });

  it("should handle failure status event error in catch block", async () => {
    // Simulate error in status event
    mockAddStatusEventAndBroadcast.mockRejectedValueOnce(
      new Error("Failed to add failure status event")
    );
    // Allow parsing and updating to succeed, throw QueueError at the end
    mockWithErrorHandling
      .mockImplementationOnce((fn) => fn()) // parseInstruction
      .mockImplementationOnce((fn) => fn()) // update
      .mockImplementationOnce((fn) => fn()) // status event
      .mockImplementationOnce(() => {
        throw new QueueError({
          message: "fail",
          type: ErrorType.UNKNOWN_ERROR,
          severity: ErrorSeverity.MEDIUM,
          timestamp: new Date(),
        });
      }); // final batch triggers failure
    const errorSpy = vi.spyOn(console, "error");
    setupInstructionWorker(testSetup.queue);
    await expect(capturedProcessFn?.(testSetup.job)).rejects.toThrow("fail");
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining("Failed to add failure status event"),
      expect.anything()
    );
    errorSpy.mockRestore();
  });
});
