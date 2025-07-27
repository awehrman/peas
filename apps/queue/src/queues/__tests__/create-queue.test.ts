import { Queue } from "bullmq";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  MOCK_REDIS_CONFIG,
  type QueueOptions,
  createMockQueue,
  createTestEnvironment,
} from "../../test-utils/helpers";
import { createQueue } from "../create-queue";

// Mock BullMQ Queue
vi.mock("bullmq", () => ({
  Queue: vi.fn(),
}));

// Mock redis config
vi.mock("../../config/redis", () => ({
  redisConfig: MOCK_REDIS_CONFIG,
}));

describe("createQueue", () => {
  let testEnv: ReturnType<typeof createTestEnvironment>;
  let MockQueue: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    testEnv = createTestEnvironment();
    MockQueue = vi.mocked(Queue);

    // Reset mocks
    MockQueue.mockClear();

    // Mock Queue constructor to return a mock instance
    MockQueue.mockImplementation((name: string, options: QueueOptions) =>
      createMockQueue(name, options)
    );
  });

  afterEach(() => {
    testEnv.restore();
    vi.clearAllMocks();
  });

  describe("Queue Creation", () => {
    it("should create a Queue with the provided name", () => {
      const queueName = "test-queue";
      const result = createQueue(queueName);

      expect(MockQueue).toHaveBeenCalledWith(queueName, {
        connection: MOCK_REDIS_CONFIG,
      });
      expect(result).toBeInstanceOf(Object);
      expect(result.name).toBe(queueName);
    });

    it("should create a Queue with redisConfig as connection", () => {
      const queueName = "processing-queue";
      createQueue(queueName);

      expect(MockQueue).toHaveBeenCalledWith(queueName, {
        connection: MOCK_REDIS_CONFIG,
      });
    });

    it("should return a Queue instance", () => {
      const queueName = "worker-queue";
      const result = createQueue(queueName);

      expect(result).toBeDefined();
      expect(typeof result).toBe("object");
      expect(result).toHaveProperty("name");
      expect(result).toHaveProperty("options");
    });
  });

  describe("Queue Names", () => {
    it("should handle simple queue names", () => {
      const queueName = "simple";
      createQueue(queueName);

      expect(MockQueue).toHaveBeenCalledWith(queueName, {
        connection: MOCK_REDIS_CONFIG,
      });
    });

    it("should handle queue names with hyphens", () => {
      const queueName = "test-queue-name";
      createQueue(queueName);

      expect(MockQueue).toHaveBeenCalledWith(queueName, {
        connection: MOCK_REDIS_CONFIG,
      });
    });

    it("should handle queue names with underscores", () => {
      const queueName = "test_queue_name";
      createQueue(queueName);

      expect(MockQueue).toHaveBeenCalledWith(queueName, {
        connection: MOCK_REDIS_CONFIG,
      });
    });

    it("should handle queue names with numbers", () => {
      const queueName = "queue-123";
      createQueue(queueName);

      expect(MockQueue).toHaveBeenCalledWith(queueName, {
        connection: MOCK_REDIS_CONFIG,
      });
    });

    it("should handle queue names with mixed characters", () => {
      const queueName = "test-queue_123";
      createQueue(queueName);

      expect(MockQueue).toHaveBeenCalledWith(queueName, {
        connection: MOCK_REDIS_CONFIG,
      });
    });

    it("should handle empty string queue names", () => {
      const queueName = "";
      createQueue(queueName);

      expect(MockQueue).toHaveBeenCalledWith(queueName, {
        connection: MOCK_REDIS_CONFIG,
      });
    });

    it("should handle single character queue names", () => {
      const queueName = "a";
      createQueue(queueName);

      expect(MockQueue).toHaveBeenCalledWith(queueName, {
        connection: MOCK_REDIS_CONFIG,
      });
    });

    it("should handle very long queue names", () => {
      const queueName = "a".repeat(1000);
      createQueue(queueName);

      expect(MockQueue).toHaveBeenCalledWith(queueName, {
        connection: MOCK_REDIS_CONFIG,
      });
    });
  });

  describe("Redis Configuration", () => {
    it("should use the imported redisConfig", () => {
      const queueName = "config-test";
      createQueue(queueName);

      expect(MockQueue).toHaveBeenCalledWith(queueName, {
        connection: MOCK_REDIS_CONFIG,
      });
    });

    it("should pass redisConfig as connection option", () => {
      const queueName = "connection-test";
      createQueue(queueName);

      expect(MockQueue).toHaveBeenCalledWith(queueName, {
        connection: MOCK_REDIS_CONFIG,
      });
    });
  });

  describe("Function Behavior", () => {
    it("should be a pure function that always returns a new Queue", () => {
      const queueName = "pure-function-test";
      const result1 = createQueue(queueName);
      const result2 = createQueue(queueName);

      expect(result1).not.toBe(result2); // Different instances
      expect(MockQueue).toHaveBeenCalledTimes(2);
      expect(MockQueue).toHaveBeenNthCalledWith(1, queueName, {
        connection: MOCK_REDIS_CONFIG,
      });
      expect(MockQueue).toHaveBeenNthCalledWith(2, queueName, {
        connection: MOCK_REDIS_CONFIG,
      });
    });

    it("should handle multiple different queue names", () => {
      const queue1 = createQueue("queue-1");
      const queue2 = createQueue("queue-2");
      const queue3 = createQueue("queue-3");

      expect(queue1.name).toBe("queue-1");
      expect(queue2.name).toBe("queue-2");
      expect(queue3.name).toBe("queue-3");
      expect(MockQueue).toHaveBeenCalledTimes(3);
    });
  });

  describe("Edge Cases", () => {
    it("should handle queue names with special characters", () => {
      const queueName = "test@queue#123";
      createQueue(queueName);

      expect(MockQueue).toHaveBeenCalledWith(queueName, {
        connection: MOCK_REDIS_CONFIG,
      });
    });

    it("should handle queue names with spaces", () => {
      const queueName = "test queue name";
      createQueue(queueName);

      expect(MockQueue).toHaveBeenCalledWith(queueName, {
        connection: MOCK_REDIS_CONFIG,
      });
    });

    it("should handle queue names with unicode characters", () => {
      const queueName = "test-queue-ñáéíóú";
      createQueue(queueName);

      expect(MockQueue).toHaveBeenCalledWith(queueName, {
        connection: MOCK_REDIS_CONFIG,
      });
    });

    it("should handle queue names that are numbers as strings", () => {
      const queueName = "12345";
      createQueue(queueName);

      expect(MockQueue).toHaveBeenCalledWith(queueName, {
        connection: MOCK_REDIS_CONFIG,
      });
    });
  });

  describe("Integration with BullMQ", () => {
    it("should create Queue with correct constructor parameters", () => {
      const queueName = "integration-test";
      createQueue(queueName);

      expect(MockQueue).toHaveBeenCalledWith(queueName, {
        connection: MOCK_REDIS_CONFIG,
      });
    });

    it("should return an object with expected Queue properties", () => {
      const queueName = "properties-test";
      const result = createQueue(queueName);

      // Check that the returned object has Queue-like properties
      expect(result).toHaveProperty("name");
      expect(result).toHaveProperty("options");
      expect(result).toHaveProperty("add");
      expect(result).toHaveProperty("close");
      expect(result).toHaveProperty("getJob");
      expect(result).toHaveProperty("getJobs");
      expect(result).toHaveProperty("getJobCounts");
      expect(result).toHaveProperty("getWaiting");
      expect(result).toHaveProperty("getActive");
      expect(result).toHaveProperty("getCompleted");
      expect(result).toHaveProperty("getFailed");
    });
  });
});
