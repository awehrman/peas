import { describe, expect, it } from "vitest";

import * as shared from "../../shared";

describe("Shared Worker Index", () => {
  it("should export error handling modules", () => {
    expect(shared).toHaveProperty("ErrorHandlingWrapperAction");
    expect(shared).toHaveProperty("LogErrorAction");
    expect(shared).toHaveProperty("CaptureErrorAction");
    expect(shared).toHaveProperty("ErrorRecoveryAction");
    expect(shared).toHaveProperty("withErrorHandling");
    expect(shared).toHaveProperty("createErrorHandlingChain");
  });

  it("should export retry modules", () => {
    expect(shared).toHaveProperty("RetryAction");
    expect(shared).toHaveProperty("RetryWrapperAction");
    expect(shared).toHaveProperty("CircuitBreakerAction");
    expect(shared).toHaveProperty("withRetry");
    expect(shared).toHaveProperty("withCircuitBreaker");
    expect(shared).toHaveProperty("withRetryFactory");
    expect(shared).toHaveProperty("withCircuitBreakerFactory");
    expect(shared).toHaveProperty("DEFAULT_RETRY_CONFIG");
  });

  it("should export action registry modules", () => {
    expect(shared).toHaveProperty("registerActions");
    expect(shared).toHaveProperty("createActionRegistration");
  });

  it("should export completion status action", () => {
    expect(shared).toHaveProperty("CompletionStatusAction");
  });

  it("should export database operations", () => {
    expect(shared).toHaveProperty("DatabaseOperations");
  });

  it("should export worker factory functions", () => {
    expect(shared).toHaveProperty("createWorkers");
    expect(shared).toHaveProperty("closeWorkers");
    expect(shared).toHaveProperty("getWorkerStatus");
    expect(shared).toHaveProperty("validateWorkerConfig");
    expect(shared).toHaveProperty("createWorkerConfig");
  });

  it("should export constants", () => {
    expect(shared).toHaveProperty("WORKER_CONSTANTS");
  });

  it("should export status utils", () => {
    expect(shared).toHaveProperty("StatusUtils");
  });
});
