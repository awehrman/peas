import { describe, it, expect, vi, beforeEach } from "vitest";
import { createEventHandlers } from "../../../../src/workers/instructions/event-handlers";
import { QueueError } from "../../../../src/utils";
import { ErrorType, ErrorSeverity } from "../../../../src/types";

const mockLogger = { log: vi.fn(), error: vi.fn() };
const mockErrorHandler = {
  createJobError: vi.fn((err, type, severity, ctx) => ({
    err,
    type,
    severity,
    ctx,
  })),
  logError: vi.fn(),
};

describe("createEventHandlers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should log completed event", () => {
    const handlers = createEventHandlers(
      mockLogger,
      mockErrorHandler,
      "test-queue"
    );
    const spy = vi.spyOn(console, "log");
    handlers.onCompleted({ id: "job-id" } as any);
    expect(spy).toHaveBeenCalledWith(
      "✅ Instruction parsing job job-id completed"
    );
    spy.mockRestore();
  });

  it("should log failed event with QueueError", () => {
    const handlers = createEventHandlers(
      mockLogger,
      mockErrorHandler,
      "test-queue"
    );
    const spy = vi.spyOn(console, "error");
    const err = new QueueError({
      message: "fail",
      type: ErrorType.UNKNOWN_ERROR,
      severity: ErrorSeverity.HIGH,
      timestamp: new Date(),
    });
    handlers.onFailed({ id: "job-id" } as any, err);
    expect(spy).toHaveBeenCalledWith(
      "❌ Instruction parsing job job-id failed:",
      err.message
    );
    spy.mockRestore();
  });

  it("should log failed event with generic error", () => {
    const handlers = createEventHandlers(
      mockLogger,
      mockErrorHandler,
      "test-queue"
    );
    const spy = vi.spyOn(console, "error");
    const err = new Error("fail");
    handlers.onFailed({ id: "job-id" } as any, err);
    expect(spy).toHaveBeenCalledWith(
      "❌ Instruction parsing job job-id failed:",
      err.message
    );
    spy.mockRestore();
  });

  it("should handle error event and log error", () => {
    const handlers = createEventHandlers(
      mockLogger,
      mockErrorHandler,
      "test-queue"
    );
    const err = new Error("unexpected");
    handlers.onError(err);
    expect(mockErrorHandler.createJobError).toHaveBeenCalledWith(
      err,
      expect.any(String),
      expect.any(String),
      expect.objectContaining({
        operation: "worker_error",
        queueName: "test-queue",
      })
    );
    expect(mockErrorHandler.logError).toHaveBeenCalled();
  });
});
