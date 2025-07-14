import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { QueueError } from "../../utils";
import { ErrorType, ErrorSeverity } from "../../types";
import {
  setupWorkerTestEnvironment,
  cleanupWorkerTestEnvironment,
  capturedProcessFn,
  capturedListeners,
  mockWithErrorHandling,
  mockLogError,
  mockShouldRetry,
  mockCalculateBackoff,
  mockCreateJobError,
  mockClassifyError,
  mockParseHTML,
  mockHealthMonitor,
  mockPrisma,
} from "../utils/worker-test-utils";

// Mock the utils module with ErrorHandler
vi.doMock("../../utils", async () => {
  const actual = await vi.importActual("../../utils");
  return {
    ...actual,
    ErrorHandler: {
      validateJobData: vi.fn(),
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

describe("setupNoteWorker", () => {
  let setupNoteWorker: any;
  let testSetup: any;

  beforeEach(async () => {
    console.log("🧪 Setting up test environment...");

    testSetup = setupWorkerTestEnvironment();

    const module = await import("../../workers/note");
    setupNoteWorker = module.setupNoteWorker;

    // Setup note-specific mocks
    mockParseHTML.mockResolvedValue({ title: "Test Note" });
    mockPrisma.note.create.mockResolvedValue({ id: 1, title: "Test Note" });
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
  });

  afterEach(() => {
    console.log("🧹 Cleaning up test environment...");
    cleanupWorkerTestEnvironment(testSetup);
  });

  it("should process a note job successfully", async () => {
    setupNoteWorker(testSetup.queue);
    await expect(capturedProcessFn?.(testSetup.job)).resolves.toBeUndefined();
    expect(mockHealthMonitor.isHealthy).toHaveBeenCalled();
    expect(mockParseHTML).toHaveBeenCalled();
    expect(mockWithErrorHandling).toHaveBeenCalled();
  });

  it("should handle job validation error", async () => {
    const validationError = {
      message: "Invalid data",
      type: ErrorType.UNKNOWN_ERROR,
      severity: ErrorSeverity.MEDIUM,
      timestamp: new Date(),
    };
    vi.mocked(mockWithErrorHandling).mockImplementationOnce(() => {
      throw new QueueError(validationError);
    });
    setupNoteWorker(testSetup.queue);
    await expect(capturedProcessFn?.(testSetup.job)).rejects.toThrow(
      "Invalid data"
    );
    expect(mockLogError).toHaveBeenCalled();
  });

  it("should handle unhealthy service", async () => {
    mockHealthMonitor.isHealthy.mockResolvedValue(false);
    setupNoteWorker(testSetup.queue);
    await expect(capturedProcessFn?.(testSetup.job)).rejects.toThrow(
      "Service is unhealthy, skipping job processing"
    );
    expect(mockLogError).toHaveBeenCalled();
  });

  it("should handle error in parseHTML", async () => {
    mockWithErrorHandling.mockImplementationOnce(() => {
      throw new Error("parse fail");
    });
    setupNoteWorker(testSetup.queue);
    await expect(capturedProcessFn?.(testSetup.job)).rejects.toThrow(
      "parse fail"
    );
    expect(mockLogError).toHaveBeenCalled();
  });

  it("should handle error in createNote", async () => {
    mockWithErrorHandling
      .mockImplementationOnce((fn) => fn()) // parseHTML
      .mockImplementationOnce(() => {
        throw new Error("create fail");
      }); // createNote
    setupNoteWorker(testSetup.queue);
    await expect(capturedProcessFn?.(testSetup.job)).rejects.toThrow(
      "create fail"
    );
    expect(mockLogError).toHaveBeenCalled();
  });

  it("should handle error in status event", async () => {
    mockWithErrorHandling
      .mockImplementationOnce((fn) => fn()) // parseHTML
      .mockImplementationOnce((fn) => fn()) // createNote
      .mockImplementationOnce(() => {
        throw new Error("status fail");
      }); // status event
    setupNoteWorker(testSetup.queue);
    await expect(capturedProcessFn?.(testSetup.job)).rejects.toThrow(
      "status fail"
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
    mockWithErrorHandling.mockImplementationOnce(() => {
      throw error;
    });
    setupNoteWorker(testSetup.queue);
    await expect(capturedProcessFn?.(testSetup.job)).rejects.toThrow(
      "retry me"
    );
    await new Promise((r) => setTimeout(r, 0));
    const logCalls = testSetup.logSpy.mock.calls.flat();
    expect(
      logCalls.some(
        (msg: any) =>
          typeof msg === "string" &&
          msg.includes("Scheduling retry for job job1 in 2000ms")
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
    mockWithErrorHandling.mockImplementationOnce(() => {
      throw error;
    });
    setupNoteWorker(testSetup.queue);
    await expect(capturedProcessFn?.(testSetup.job)).rejects.toThrow(
      "fail permanently"
    );
    await new Promise((r) => setTimeout(r, 0));
    const logCalls = testSetup.logSpy.mock.calls.flat();
    expect(
      logCalls.some(
        (msg: any) =>
          typeof msg === "string" &&
          msg.includes("Job job1 failed permanently after 1 attempts")
      )
    ).toBe(true);
  });

  it("should handle unexpected error", async () => {
    mockWithErrorHandling.mockImplementation(() => {
      throw new Error("unexpected");
    });
    setupNoteWorker(testSetup.queue);
    await expect(capturedProcessFn?.(testSetup.job)).rejects.toThrow(
      "unexpected"
    );
    expect(mockLogError).toHaveBeenCalled();
  });

  it("should call completed event listener", () => {
    setupNoteWorker(testSetup.queue);
    const completedListener = capturedListeners["completed"]?.[0];
    expect(completedListener).toBeDefined();
    completedListener!({ id: "job1" });
    expect(testSetup.logSpy).toHaveBeenCalledWith(
      expect.stringContaining("completed")
    );
  });

  it("should call failed event listener with QueueError", () => {
    setupNoteWorker(testSetup.queue);
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
    setupNoteWorker(testSetup.queue);
    const failedListener = capturedListeners["failed"]?.[0];
    expect(failedListener).toBeDefined();
    failedListener?.({ id: "job1" }, new Error("fail"));
    expect(testSetup.errorSpy).toHaveBeenCalledWith(
      expect.stringContaining("failed:"),
      "fail"
    );
  });

  it("should call error event listener", () => {
    setupNoteWorker(testSetup.queue);
    const errorListener = capturedListeners["error"]?.[0];
    expect(errorListener).toBeDefined();
    errorListener?.(new Error("err"));
    expect(mockCreateJobError).toHaveBeenCalled();
    expect(mockLogError).toHaveBeenCalled();
  });
});
