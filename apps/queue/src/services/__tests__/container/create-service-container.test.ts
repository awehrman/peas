/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createServiceContainer, IServiceContainer } from "../../container";

// Mock dependencies
vi.mock("../../register-queues", () => ({
  registerQueues: vi.fn(() => ({
    noteQueue: { close: vi.fn() } as any,
    imageQueue: { close: vi.fn() } as any,
    ingredientQueue: { close: vi.fn() } as any,
    instructionQueue: { close: vi.fn() } as any,
    categorizationQueue: { close: vi.fn() } as any,
    sourceQueue: { close: vi.fn() } as any,
  })),
}));

vi.mock("../../register-database", () => ({
  registerDatabase: vi.fn(() => ({
    prisma: { $disconnect: vi.fn() },
    patternTracker: { trackPattern: vi.fn() },
    createNote: vi.fn(),
  })),
}));

vi.mock("../../register-logger", () => ({
  registerLogger: vi.fn(() => ({
    log: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    fatal: vi.fn(),
    logWithContext: vi.fn(),
    getLogFiles: vi.fn(),
    rotateLogs: vi.fn(),
    getLogStats: vi.fn(),
    clearOldLogs: vi.fn(),
  })),
}));

describe("createServiceContainer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("Default Creation", () => {
    it("should create a service container with default services", () => {
      const container = createServiceContainer();

      expect(container).toBeDefined();
      expect(container).toHaveProperty("queues");
      expect(container).toHaveProperty("database");
      expect(container).toHaveProperty("errorHandler");
      expect(container).toHaveProperty("healthMonitor");
      expect(container).toHaveProperty("webSocket");
      expect(container).toHaveProperty("statusBroadcaster");
      expect(container).toHaveProperty("parsers");
      expect(container).toHaveProperty("logger");
      expect(container).toHaveProperty("config");
      expect(container).toHaveProperty("close");
    });

    it("should implement IServiceContainer interface", () => {
      const container = createServiceContainer();
      const serviceContainer: IServiceContainer = container;

      expect(serviceContainer).toBeDefined();
      expect(typeof serviceContainer.close).toBe("function");
    });

    it("should return a new instance each time", () => {
      const container1 = createServiceContainer();
      const container2 = createServiceContainer();

      expect(container1).not.toBe(container2);
    });
  });

  describe("Service Overrides", () => {
    it("should allow overriding queues service", () => {
      const mockQueues = {
        noteQueue: { close: vi.fn() } as any,
        imageQueue: { close: vi.fn() } as any,
        ingredientQueue: { close: vi.fn() } as any,
        instructionQueue: { close: vi.fn() } as any,
        categorizationQueue: { close: vi.fn() } as any,
        sourceQueue: { close: vi.fn() } as any,
      };

      const container = createServiceContainer({ queues: mockQueues });

      expect(container.queues).toBe(mockQueues);
    });

    it("should allow overriding database service", () => {
      const mockDatabase = {
        prisma: { $disconnect: vi.fn() } as any,
        patternTracker: { trackPattern: vi.fn() },
        createNote: vi.fn(),
      } as any;

      const container = createServiceContainer({ database: mockDatabase });

      expect(container.database).toBe(mockDatabase);
    });

    it("should allow overriding logger service", () => {
      const mockLogger = {
        log: vi.fn(),
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        fatal: vi.fn(),
        logWithContext: vi.fn(),
        getLogFiles: vi.fn(),
        rotateLogs: vi.fn(),
        getLogStats: vi.fn(),
        clearOldLogs: vi.fn(),
      };

      const container = createServiceContainer({ logger: mockLogger });

      expect(container.logger).toBe(mockLogger);
    });

    it("should allow overriding config service", () => {
      const mockConfig = {
        port: 8080,
        wsPort: 8081,
        wsHost: "test-host",
        wsUrl: "ws://test-host:8081",
        redisConnection: {
          host: "test-redis",
          port: 6379,
          username: undefined,
          password: undefined,
        },
        batchSize: 20,
        maxRetries: 5,
        backoffMs: 2000,
        maxBackoffMs: 60000,
      };

      const container = createServiceContainer({ config: mockConfig });

      expect(container.config).toBe(mockConfig);
    });

    it("should allow overriding multiple services", () => {
      const mockQueues = { noteQueue: { close: vi.fn() } } as any;
      const mockDatabase = {
        prisma: { $disconnect: vi.fn() },
        createNote: vi.fn(),
      } as any;
      const mockLogger = { log: vi.fn() };

      const container = createServiceContainer({
        queues: mockQueues,
        database: mockDatabase,
        logger: mockLogger,
      });

      expect(container.queues).toBe(mockQueues);
      expect(container.database).toBe(mockDatabase);
      expect(container.logger).toBe(mockLogger);
    });
  });

  describe("Partial Overrides", () => {
    it("should use default services for non-overridden properties", () => {
      const mockQueues = { noteQueue: { close: vi.fn() } } as any;

      const container = createServiceContainer({ queues: mockQueues });

      expect(container.queues).toBe(mockQueues);
      expect(container.database).toBeDefined();
      expect(container.logger).toBeDefined();
      expect(container.config).toBeDefined();
    });

    it("should maintain default service functionality for non-overridden services", () => {
      const container = createServiceContainer({});

      expect(typeof container.close).toBe("function");
      expect(container.queues).toHaveProperty("noteQueue");
      expect(container.database).toHaveProperty("prisma");
      expect(container.logger).toHaveProperty("log");
    });
  });

  describe("Close Method Override", () => {
    it("should allow overriding the close method", async () => {
      const mockClose = vi.fn();
      const container = createServiceContainer({ close: mockClose });

      await container.close();

      expect(mockClose).toHaveBeenCalled();
    });

    it("should use default close method when not overridden", async () => {
      const container = createServiceContainer();

      await expect(container.close()).resolves.not.toThrow();
    });
  });

  describe("Error Handling", () => {
    it("should handle invalid overrides gracefully", () => {
      const invalidOverrides = {
        queues: null,
        database: undefined,
        logger: "invalid",
      };

      expect(() => {
        createServiceContainer(invalidOverrides as any);
      }).not.toThrow();
    });

    it("should handle missing override properties", () => {
      const partialOverrides = {
        queues: { noteQueue: { close: vi.fn() } },
        // database and logger are missing
      };

      const container = createServiceContainer(partialOverrides as any);

      expect(container.queues).toBe(partialOverrides.queues);
      expect(container.database).toBeDefined();
      expect(container.logger).toBeDefined();
    });
  });

  describe("Type Safety", () => {
    it("should maintain type safety with proper overrides", () => {
      const mockQueues = {
        noteQueue: { close: vi.fn() },
        imageQueue: { close: vi.fn() },
        ingredientQueue: { close: vi.fn() },
        instructionQueue: { close: vi.fn() },
        categorizationQueue: { close: vi.fn() },
        sourceQueue: { close: vi.fn() },
      } as any;

      const container = createServiceContainer({ queues: mockQueues });

      // Should be able to call close on queues
      expect(() => {
        container.queues.noteQueue.close();
      }).not.toThrow();
    });

    it("should allow partial service overrides", () => {
      const container = createServiceContainer({
        config: {
          port: 9000,
          wsPort: 9001,
          wsHost: "custom-host",
          wsUrl: "ws://custom-host:9001",
          redisConnection: {
            host: "custom-redis",
            port: 6379,
            username: undefined,
            password: undefined,
          },
          batchSize: 50,
          maxRetries: 10,
          backoffMs: 5000,
          maxBackoffMs: 120000,
        },
      });

      expect(container.config.port).toBe(9000);
      expect(container.config.wsHost).toBe("custom-host");
      expect(container.config.batchSize).toBe(50);
    });
  });
});
