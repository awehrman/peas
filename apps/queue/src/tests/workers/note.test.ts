import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { QueueError } from "../../utils"; // Use the real class
import { ErrorType, ErrorSeverity } from "../../types";

// Mocks for dependencies
var mockParseHTML = vi.fn();
var mockCreateNote = vi.fn();
var mockAddStatusEventAndBroadcast = vi.fn();
var mockWithErrorHandling = vi.fn();
var mockValidateJobData = vi.fn();
var mockLogError = vi.fn();
var mockShouldRetry = vi.fn();
var mockCalculateBackoff = vi.fn();
var mockCreateJobError = vi.fn();
var mockClassifyError = vi.fn();

vi.mock("../../parsers/html", () => ({
  parseHTML: mockParseHTML,
}));
vi.mock("@peas/database", () => ({
  createNote: mockCreateNote,
}));
vi.mock("../../utils/status-broadcaster", () => ({
  addStatusEventAndBroadcast: mockAddStatusEventAndBroadcast,
}));

var mockHealthMonitor = {
  isHealthy: vi.fn(),
};
vi.mock("../../utils/health-monitor", () => ({
  HealthMonitor: { getInstance: () => mockHealthMonitor },
}));

// Mock the utils module with ErrorHandler
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
var capturedProcessFn: ((job: any) => Promise<any>) | null = null;
var capturedListeners: Record<string, Array<(...args: any[]) => any>> = {};

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

describe("setupNoteWorker", () => {
  let setupNoteWorker: any;
  let queue: any;
  let job: any;
  let originalConsoleLog: any;
  let originalConsoleError: any;
  let logSpy: any;
  let errorSpy: any;

  beforeEach(async () => {
    // Set up spies BEFORE importing the worker
    logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const module = await import("../../workers/note");
    setupNoteWorker = module.setupNoteWorker;

    queue = { name: "note-queue" };
    job = {
      id: "job1",
      attemptsMade: 0,
      data: { content: "<html>...</html>" },
    };
    vi.clearAllMocks();
    mockHealthMonitor.isHealthy.mockResolvedValue(true);
    mockValidateJobData.mockReturnValue(null);
    mockWithErrorHandling.mockImplementation((fn) => fn());
    mockParseHTML.mockResolvedValue({ title: "Test Note" });
    mockCreateNote.mockResolvedValue({ id: 1 });
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
    if (logSpy.mock.calls.length) {
      // Print all log calls for debugging
      logSpy.mock.calls.forEach((call, i) => {
        // Print all arguments for each call
        console.log(`[LOG CALL ${i}]`, ...call);
      });
    }
  });

  it("should process a note job successfully", async () => {
    setupNoteWorker(queue);
    await expect(capturedProcessFn?.(job)).resolves.toBeUndefined();
    expect(mockValidateJobData).toHaveBeenCalled();
    expect(mockHealthMonitor.isHealthy).toHaveBeenCalled();
    expect(mockParseHTML).toHaveBeenCalled();
    expect(mockCreateNote).toHaveBeenCalled();
    expect(mockAddStatusEventAndBroadcast).toHaveBeenCalled();
  });

  it("should handle job validation error", async () => {
    const validationError = { message: "Invalid data" };
    mockValidateJobData.mockReturnValue(validationError);
    setupNoteWorker(queue);
    await expect(capturedProcessFn?.(job)).rejects.toThrow("Invalid data");
    expect(mockLogError).toHaveBeenCalled();
  });

  it("should handle unhealthy service", async () => {
    mockHealthMonitor.isHealthy.mockResolvedValue(false);
    setupNoteWorker(queue);
    await expect(capturedProcessFn?.(job)).rejects.toThrow(
      "Service is unhealthy, skipping job processing"
    );
    expect(mockLogError).toHaveBeenCalled();
  });

  it("should handle error in parseHTML", async () => {
    mockWithErrorHandling.mockImplementationOnce(() => {
      throw new Error("parse fail");
    });
    setupNoteWorker(queue);
    await expect(capturedProcessFn?.(job)).rejects.toThrow("parse fail");
    expect(mockLogError).toHaveBeenCalled();
  });

  it("should handle error in createNote", async () => {
    mockWithErrorHandling
      .mockImplementationOnce((fn) => fn())
      .mockImplementationOnce(() => {
        throw new Error("db fail");
      });
    setupNoteWorker(queue);
    await expect(capturedProcessFn?.(job)).rejects.toThrow("db fail");
    expect(mockLogError).toHaveBeenCalled();
  });

  it("should handle error in addStatusEventAndBroadcast", async () => {
    mockWithErrorHandling
      .mockImplementationOnce((fn) => fn())
      .mockImplementationOnce((fn) => fn())
      .mockImplementationOnce(() => {
        throw new Error("status fail");
      });
    setupNoteWorker(queue);
    await expect(capturedProcessFn?.(job)).rejects.toThrow("status fail");
    expect(mockLogError).toHaveBeenCalled();
  });

  it("should handle error in sub-task queueing", async () => {
    setupNoteWorker(queue);
    // Patch the sub-task queues
    const error = new Error("sub-task fail");
    // Simulate error in the first sub-task
    mockWithErrorHandling.mockImplementation((fn) => fn());
    // Patch the add method of the first sub-task queue to throw
    const origAdd = {
      add: vi.fn().mockImplementation(() => {
        throw error;
      }),
    };
    // Patch the queues used in subTasks
    (global as any).ingredientQueue = origAdd;
    (global as any).instructionQueue = { add: vi.fn() };
    (global as any).imageQueue = { add: vi.fn() };
    (global as any).categorizationQueue = { add: vi.fn() };
    await expect(capturedProcessFn?.(job)).resolves.toBeUndefined();
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
    // Make the first withErrorHandling call throw the QueueError
    mockWithErrorHandling
      .mockImplementationOnce((fn) => fn()) // parseHTML
      .mockImplementationOnce(() => {
        throw error;
      }); // createNote
    setupNoteWorker(queue);
    await expect(capturedProcessFn?.(job)).rejects.toThrow("retry me");
    await new Promise((r) => setTimeout(r, 0)); // flush microtasks
    const logCalls = logSpy.mock.calls.flat();
    // Debug output - use process.stdout.write to bypass logSpy
    process.stdout.write(
      "[DEBUG] logSpy.mock.calls: " + JSON.stringify(logSpy.mock.calls) + "\n"
    );
    process.stdout.write(
      "[DEBUG] All log calls: " + JSON.stringify(logCalls) + "\n"
    );
    process.stdout.write("[DEBUG] Looking for retry message...\n");
    const retryMessage = logCalls.find(
      (msg: any) =>
        typeof msg === "string" &&
        msg.includes("Scheduling retry for job job1 in 2000ms")
    );
    process.stdout.write(
      "[DEBUG] Found retry message: " + JSON.stringify(retryMessage) + "\n"
    );
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
    // Make the first withErrorHandling call throw the QueueError
    mockWithErrorHandling
      .mockImplementationOnce((fn) => fn()) // parseHTML
      .mockImplementationOnce(() => {
        throw error;
      }); // createNote
    setupNoteWorker(queue);
    await expect(capturedProcessFn?.(job)).rejects.toThrow("fail permanently");
    await new Promise((r) => setTimeout(r, 0)); // flush microtasks
    const logCalls = logSpy.mock.calls.flat();
    // Debug output - use process.stdout.write to bypass logSpy
    process.stdout.write(
      "[DEBUG] logSpy.mock.calls: " + JSON.stringify(logSpy.mock.calls) + "\n"
    );
    process.stdout.write(
      "[DEBUG] All log calls: " + JSON.stringify(logCalls) + "\n"
    );
    process.stdout.write("[DEBUG] Looking for permanent fail message...\n");
    const permanentFailMessage = logCalls.find(
      (msg: any) =>
        typeof msg === "string" &&
        msg.includes("Job job1 failed permanently after 1 attempts")
    );
    process.stdout.write(
      "[DEBUG] Found permanent fail message: " +
        JSON.stringify(permanentFailMessage) +
        "\n"
    );
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
    setupNoteWorker(queue);
    await expect(capturedProcessFn?.(job)).rejects.toThrow("unexpected");
    expect(mockLogError).toHaveBeenCalled();
  });

  it("should call completed event listener", () => {
    setupNoteWorker(queue);
    const completedListener = capturedListeners["completed"]?.[0];
    expect(completedListener).toBeDefined();
    completedListener!({ id: "job1" });
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining("completed"));
  });

  it("should call failed event listener with QueueError", () => {
    setupNoteWorker(queue);
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
    setupNoteWorker(queue);
    const failedListener = capturedListeners["failed"]?.[0];
    expect(failedListener).toBeDefined();
    failedListener?.({ id: "job1" }, new Error("fail"));
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining("failed:"),
      "fail"
    );
  });

  it("should call error event listener", () => {
    setupNoteWorker(queue);
    const errorListener = capturedListeners["error"]?.[0];
    expect(errorListener).toBeDefined();
    errorListener?.(new Error("err"));
    expect(mockCreateJobError).toHaveBeenCalled();
    expect(mockLogError).toHaveBeenCalled();
  });
});
