import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Queue } from "bullmq";
import { registerIngredientEventHandlers } from "../../../../src/workers/ingredients/event-handlers";
import { QueueError } from "../../../../src/utils/error-handler";
import { ErrorType, ErrorSeverity } from "../../../../src/types";

// Mock dependencies
vi.mock("../../../../src/utils/error-handler", async () => {
  const actual = await import("../../../../src/utils/error-handler");
  return {
    ...actual,
    ErrorHandler: {
      ...actual.ErrorHandler,
      createJobError: vi.fn(),
      logError: vi.fn(),
    },
  };
});

describe("Ingredient Event Handlers", () => {
  let mockWorker: any;
  let mockQueue: Queue;
  let mockConsoleLog: any;
  let mockConsoleError: any;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Mock console methods
    mockConsoleLog = vi.spyOn(console, "log").mockImplementation(() => {});
    mockConsoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    // Mock Worker
    mockWorker = {
      on: vi.fn(),
    };

    // Mock Queue
    mockQueue = {
      name: "test-ingredient-queue",
    } as Queue;

    // Mock ErrorHandler
    const { ErrorHandler } = await import(
      "../../../../src/utils/error-handler"
    );
    vi.mocked(ErrorHandler.createJobError).mockReturnValue({
      type: ErrorType.UNKNOWN_ERROR,
      severity: ErrorSeverity.CRITICAL,
      message: "test error",
      timestamp: new Date(),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("registerIngredientEventHandlers", () => {
    it("should register completed event handler", () => {
      registerIngredientEventHandlers(mockWorker, mockQueue);

      expect(mockWorker.on).toHaveBeenCalledWith(
        "completed",
        expect.any(Function)
      );
    });

    it("should register failed event handler", () => {
      registerIngredientEventHandlers(mockWorker, mockQueue);

      expect(mockWorker.on).toHaveBeenCalledWith(
        "failed",
        expect.any(Function)
      );
    });

    it("should register error event handler", () => {
      registerIngredientEventHandlers(mockWorker, mockQueue);

      expect(mockWorker.on).toHaveBeenCalledWith("error", expect.any(Function));
    });

    it("should log completed event", () => {
      registerIngredientEventHandlers(mockWorker, mockQueue);

      const completedCall = vi
        .mocked(mockWorker.on)
        .mock.calls.find((call: any) => call[0] === "completed");
      const completedHandler = completedCall![1];

      completedHandler({ id: "job-id" });

      expect(mockConsoleLog).toHaveBeenCalledWith(
        "✅ Ingredient parsing job job-id completed"
      );
    });

    it("should log failed event with QueueError", () => {
      registerIngredientEventHandlers(mockWorker, mockQueue);

      const failedCall = vi
        .mocked(mockWorker.on)
        .mock.calls.find((call: any) => call[0] === "failed");
      const failedHandler = failedCall![1];

      const err = new QueueError({
        message: "fail",
        type: ErrorType.UNKNOWN_ERROR,
        severity: ErrorSeverity.HIGH,
        timestamp: new Date(),
      });
      failedHandler({ id: "job-id" }, err);

      expect(mockConsoleError).toHaveBeenCalledWith(
        "❌ Ingredient parsing job job-id failed:",
        "fail"
      );
    });

    it("should log failed event with generic error", () => {
      registerIngredientEventHandlers(mockWorker, mockQueue);

      const failedCall = vi
        .mocked(mockWorker.on)
        .mock.calls.find((call: any) => call[0] === "failed");
      const failedHandler = failedCall![1];

      const err = new Error("fail");
      failedHandler({ id: "job-id" }, err);

      expect(mockConsoleError).toHaveBeenCalledWith(
        "❌ Ingredient parsing job job-id failed:",
        "fail"
      );
    });

    it("should handle error event", async () => {
      const { ErrorHandler } = await import(
        "../../../../src/utils/error-handler"
      );

      registerIngredientEventHandlers(mockWorker, mockQueue);

      const errorCall = vi
        .mocked(mockWorker.on)
        .mock.calls.find((call: any) => call[0] === "error");
      const errorHandler = errorCall![1];

      const err = new Error("worker error");
      errorHandler(err);

      expect(ErrorHandler.createJobError).toHaveBeenCalledWith(
        err,
        ErrorType.UNKNOWN_ERROR,
        ErrorSeverity.CRITICAL,
        { operation: "worker_error", queueName: "test-ingredient-queue" }
      );
      expect(ErrorHandler.logError).toHaveBeenCalled();
    });

    it("should handle unknown job id in completed event", () => {
      registerIngredientEventHandlers(mockWorker, mockQueue);

      const completedCall = vi
        .mocked(mockWorker.on)
        .mock.calls.find((call: any) => call[0] === "completed");
      const completedHandler = completedCall![1];

      completedHandler({});

      expect(mockConsoleLog).toHaveBeenCalledWith(
        "✅ Ingredient parsing job unknown completed"
      );
    });

    it("should handle unknown job id in failed event", () => {
      registerIngredientEventHandlers(mockWorker, mockQueue);

      const failedCall = vi
        .mocked(mockWorker.on)
        .mock.calls.find((call: any) => call[0] === "failed");
      const failedHandler = failedCall![1];

      const err = new Error("fail");
      failedHandler({}, err);

      expect(mockConsoleError).toHaveBeenCalledWith(
        "❌ Ingredient parsing job unknown failed:",
        "fail"
      );
    });
  });
});
