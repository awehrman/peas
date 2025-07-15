import { describe, it, expect, vi, beforeEach } from "vitest";
import { Job } from "bullmq";
import { TestLogger, TestErrorHandler } from "./types";

describe("notes/event-handlers", () => {
  let logger: TestLogger;
  let errorHandler: TestErrorHandler;
  let queueName: string;

  beforeEach(() => {
    logger = { log: vi.fn(), error: vi.fn() };
    errorHandler = {
      createJobError: vi.fn((err, type, severity, ctx) => ({
        err,
        type,
        severity,
        ctx,
        timestamp: new Date(),
      })),
      logError: vi.fn(),
      withErrorHandling: vi.fn(),
      shouldRetry: vi.fn(),
      calculateBackoff: vi.fn(),
      classifyError: vi.fn(),
      validateJobData: vi.fn(),
    };
    queueName = "test-queue";
  });

  // Simple mock job with only the properties we need
  const createMockJob = (id: string) => ({
    id,
    queue: { name: "test-queue" },
    name: "test-job",
    data: {},
    opts: {},
  });

  const mockJob = createMockJob("job-1");
  const mockJob2 = createMockJob("job-2");

  it("calls logger.log on completed", async () => {
    const { createEventHandlers } = await import(
      "../../../workers/notes/event-handlers"
    );
    const handlers = createEventHandlers(
      logger,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      errorHandler as any,
      queueName
    );
    handlers.onCompleted(mockJob as unknown as Job);
    expect(logger.log).toHaveBeenCalledWith(expect.stringContaining("job-1"));
  });

  it("calls logger.error on failed", async () => {
    const { createEventHandlers } = await import(
      "../../../workers/notes/event-handlers"
    );
    const handlers = createEventHandlers(
      logger,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      errorHandler as any,
      queueName
    );
    const error = new Error("fail");
    handlers.onFailed(mockJob2 as unknown as Job, error);
    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining("job-2"),
      error
    );
  });

  it("calls errorHandler.createJobError and logError on error", async () => {
    const { createEventHandlers } = await import(
      "../../../workers/notes/event-handlers"
    );
    const handlers = createEventHandlers(
      logger,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      errorHandler as any,
      queueName
    );
    const error = new Error("fail");
    handlers.onError(error);
    expect(errorHandler.createJobError).toHaveBeenCalledWith(
      error,
      expect.anything(),
      expect.anything(),
      expect.objectContaining({ operation: "worker_error", queueName })
    );
    expect(errorHandler.logError).toHaveBeenCalled();
  });
});
