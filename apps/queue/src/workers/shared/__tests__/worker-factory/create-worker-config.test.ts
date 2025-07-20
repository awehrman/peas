import { describe, it, expect, vi, beforeEach } from "vitest";
import { Queue } from "bullmq";
import { createWorkerConfig } from "../../worker-factory";
import type { WorkerFactory } from "../../worker-factory";

describe("createWorkerConfig", () => {
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

  it("should create valid worker config", () => {
    const config = createWorkerConfig("test-worker", mockFactory, mockQueue);

    expect(config).toEqual({
      name: "test-worker",
      factory: mockFactory,
      queue: mockQueue,
    });
  });

  it("should validate config during creation", () => {
    const config = createWorkerConfig("valid-worker", mockFactory, mockQueue);

    expect(config.name).toBe("valid-worker");
    expect(config.factory).toBe(mockFactory);
    expect(config.queue).toBe(mockQueue);
  });

  it("should throw error for invalid name during creation", () => {
    expect(() => createWorkerConfig("", mockFactory, mockQueue)).toThrow(
      "Worker config must have a valid name"
    );
  });

  it("should throw error for invalid factory during creation", () => {
    expect(() =>
      createWorkerConfig(
        "test-worker",
        "not-a-function" as unknown as import("../../worker-factory").WorkerFactory,
        mockQueue
      )
    ).toThrow("Worker config must have a valid factory function");
  });

  it("should throw error for invalid queue during creation", () => {
    expect(() =>
      createWorkerConfig(
        "test-worker",
        mockFactory,
        null as unknown as import("bullmq").Queue
      )
    ).toThrow("Worker config must have a valid queue");
  });

  it("should handle special characters in name", () => {
    const config = createWorkerConfig(
      "worker-with-special-chars_123",
      mockFactory,
      mockQueue
    );

    expect(config.name).toBe("worker-with-special-chars_123");
    expect(config.factory).toBe(mockFactory);
    expect(config.queue).toBe(mockQueue);
  });

  it("should handle very long name", () => {
    const longName = "a".repeat(1000);
    const config = createWorkerConfig(longName, mockFactory, mockQueue);

    expect(config.name).toBe(longName);
    expect(config.factory).toBe(mockFactory);
    expect(config.queue).toBe(mockQueue);
  });

  it("should return config with correct structure", () => {
    const config = createWorkerConfig("test-worker", mockFactory, mockQueue);

    expect(config).toHaveProperty("name");
    expect(config).toHaveProperty("factory");
    expect(config).toHaveProperty("queue");
    expect(typeof config.name).toBe("string");
    expect(typeof config.factory).toBe("function");
    expect(config.queue).toBeDefined();
  });

  it("should handle different factory functions", () => {
    const factory1 = vi.fn().mockReturnValue({ name: "worker1" });
    const factory2 = vi.fn().mockReturnValue({ name: "worker2" });

    const config1 = createWorkerConfig("worker1", factory1, mockQueue);
    const config2 = createWorkerConfig("worker2", factory2, mockQueue);

    expect(config1.factory).toBe(factory1);
    expect(config2.factory).toBe(factory2);
    expect(config1.factory).not.toBe(config2.factory);
  });

  it("should handle different queue instances", () => {
    const queue1 = { name: "queue1" } as unknown as import("bullmq").Queue;
    const queue2 = { name: "queue2" } as unknown as import("bullmq").Queue;

    const config1 = createWorkerConfig("worker1", mockFactory, queue1);
    const config2 = createWorkerConfig("worker2", mockFactory, queue2);

    expect(config1.queue).toBe(queue1);
    expect(config2.queue).toBe(queue2);
    expect(config1.queue).not.toBe(config2.queue);
  });
});
