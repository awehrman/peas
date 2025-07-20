import { describe, it, expect, vi, beforeEach } from "vitest";
import { Queue } from "bullmq";
import { validateWorkerConfig } from "../../worker-factory";
import type { WorkerFactory } from "../../worker-factory";

describe("validateWorkerConfig", () => {
  let mockQueue: Queue;
  let mockFactory: WorkerFactory;

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock queue
    mockQueue = {
      name: "test-queue",
    } as unknown as import("bullmq").Queue;

    // Mock factory
    mockFactory = vi.fn().mockReturnValue({
      name: "test-worker",
      close: vi.fn().mockResolvedValue(undefined),
      getStatus: vi.fn().mockReturnValue({ isRunning: true }),
      execute: vi.fn(),
    });
  });

  it("should validate correct worker config", () => {
    const config = {
      name: "test-worker",
      factory: mockFactory,
      queue: mockQueue,
    };

    expect(() => validateWorkerConfig(config)).not.toThrow();
  });

  it("should throw error for missing name", () => {
    const config = {
      name: "",
      factory: mockFactory,
      queue: mockQueue,
    };

    expect(() => validateWorkerConfig(config)).toThrow(
      "Worker config must have a valid name"
    );
  });

  it("should throw error for undefined name", () => {
    const config = {
      name: undefined,
      factory: mockFactory,
      queue: mockQueue,
    } as unknown as import("../../worker-factory").WorkerConfig;

    expect(() => validateWorkerConfig(config)).toThrow(
      "Worker config must have a valid name"
    );
  });

  it("should throw error for null name", () => {
    const config = {
      name: null,
      factory: mockFactory,
      queue: mockQueue,
    } as unknown as import("../../worker-factory").WorkerConfig;

    expect(() => validateWorkerConfig(config)).toThrow(
      "Worker config must have a valid name"
    );
  });

  it("should throw error for non-string name", () => {
    const config = {
      name: 123,
      factory: mockFactory,
      queue: mockQueue,
    } as unknown as import("../../worker-factory").WorkerConfig;

    expect(() => validateWorkerConfig(config)).toThrow(
      "Worker config must have a valid name"
    );
  });

  it("should throw error for missing factory", () => {
    const config = {
      name: "test-worker",
      factory: undefined,
      queue: mockQueue,
    } as unknown as import("../../worker-factory").WorkerConfig;

    expect(() => validateWorkerConfig(config)).toThrow(
      "Worker config must have a valid factory function"
    );
  });

  it("should throw error for null factory", () => {
    const config = {
      name: "test-worker",
      factory: null,
      queue: mockQueue,
    } as unknown as import("../../worker-factory").WorkerConfig;

    expect(() => validateWorkerConfig(config)).toThrow(
      "Worker config must have a valid factory function"
    );
  });

  it("should throw error for non-function factory", () => {
    const config = {
      name: "test-worker",
      factory: "not-a-function",
      queue: mockQueue,
    } as unknown as import("../../worker-factory").WorkerConfig;

    expect(() => validateWorkerConfig(config)).toThrow(
      "Worker config must have a valid factory function"
    );
  });

  it("should throw error for missing queue", () => {
    const config = {
      name: "test-worker",
      factory: mockFactory,
      queue: undefined,
    } as unknown as import("../../worker-factory").WorkerConfig;

    expect(() => validateWorkerConfig(config)).toThrow(
      "Worker config must have a valid queue"
    );
  });

  it("should throw error for null queue", () => {
    const config = {
      name: "test-worker",
      factory: mockFactory,
      queue: null,
    } as unknown as import("../../worker-factory").WorkerConfig;

    expect(() => validateWorkerConfig(config)).toThrow(
      "Worker config must have a valid queue"
    );
  });

  it("should throw error for falsy queue", () => {
    const config = {
      name: "test-worker",
      factory: mockFactory,
      queue: false,
    } as unknown as import("../../worker-factory").WorkerConfig;

    expect(() => validateWorkerConfig(config)).toThrow(
      "Worker config must have a valid queue"
    );
  });

  it("should accept valid queue object", () => {
    const config = {
      name: "test-worker",
      factory: mockFactory,
      queue: mockQueue,
    };

    expect(() => validateWorkerConfig(config)).not.toThrow();
  });

  it("should accept valid factory function", () => {
    const config = {
      name: "test-worker",
      factory: mockFactory,
      queue: mockQueue,
    };

    expect(() => validateWorkerConfig(config)).not.toThrow();
  });

  it("should accept valid string name", () => {
    const config = {
      name: "valid-worker-name",
      factory: mockFactory,
      queue: mockQueue,
    };

    expect(() => validateWorkerConfig(config)).not.toThrow();
  });

  it("should handle multiple validation errors (first one thrown)", () => {
    const config = {
      name: "", // Invalid name
      factory: "not-a-function", // Invalid factory
      queue: null, // Invalid queue
    } as unknown as import("../../worker-factory").WorkerConfig;

    expect(() => validateWorkerConfig(config)).toThrow(
      "Worker config must have a valid name"
    );
  });

  it("should validate config with special characters in name", () => {
    const config = {
      name: "worker-with-special-chars_123",
      factory: mockFactory,
      queue: mockQueue,
    };

    expect(() => validateWorkerConfig(config)).not.toThrow();
  });

  it("should validate config with very long name", () => {
    const longName = "a".repeat(1000);
    const config = {
      name: longName,
      factory: mockFactory,
      queue: mockQueue,
    };

    expect(() => validateWorkerConfig(config)).not.toThrow();
  });
});
