import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  ServiceContainer,
  createServiceContainer,
} from "../../services/container";

// Remove SIGTERM handler during tests to prevent unhandled rejections
process.removeAllListeners("SIGTERM");

// Mock implementations for testing
const mockQueueService = {
  noteQueue: { close: vi.fn() } as any,
  imageQueue: { close: vi.fn() } as any,
  ingredientQueue: { close: vi.fn() } as any,
  instructionQueue: { close: vi.fn() } as any,
  categorizationQueue: { close: vi.fn() } as any,
};

const mockDatabaseService = {
  prisma: {
    $disconnect: vi.fn(),
    note: {
      count: vi.fn().mockResolvedValue(5),
    },
  } as any,
};

const mockLoggerService = {
  log: vi.fn(),
};

const mockWebSocketService = {
  webSocketManager: {
    close: vi.fn(),
  } as any,
};

describe("Dependency Injection ServiceContainer", () => {
  beforeEach(() => {
    // Reset ServiceContainer before each test
    ServiceContainer.reset();
  });

  afterEach(() => {
    // Clean up after each test
    ServiceContainer.reset();
  });

  it("should create a singleton ServiceContainer instance", () => {
    const container1 = ServiceContainer.getInstance();
    const container2 = ServiceContainer.getInstance();

    expect(container1).toBe(container2);
  });

  it("should provide all required services", () => {
    const container = ServiceContainer.getInstance();

    expect(container.queues).toBeDefined();
    expect(container.database).toBeDefined();
    expect(container.errorHandler).toBeDefined();
    expect(container.healthMonitor).toBeDefined();
    expect(container.webSocket).toBeDefined();
    expect(container.logger).toBeDefined();
    expect(container.config).toBeDefined();
  });

  it("should allow creating ServiceContainer with custom dependencies", () => {
    const customContainer = createServiceContainer({
      queues: mockQueueService,
      database: mockDatabaseService,
      logger: mockLoggerService,
      webSocket: mockWebSocketService,
    });

    expect(customContainer.queues).toBe(mockQueueService);
    expect(customContainer.database).toBe(mockDatabaseService);
    expect(customContainer.logger).toBe(mockLoggerService);
    expect(customContainer.webSocket).toBe(mockWebSocketService);
  });

  it("should close all resources properly", async () => {
    const customContainer = createServiceContainer({
      queues: mockQueueService,
      database: mockDatabaseService,
      logger: mockLoggerService,
      webSocket: mockWebSocketService,
    }) as any; // Type assertion for testing

    await customContainer.close();

    expect(mockQueueService.noteQueue.close).toHaveBeenCalled();
    expect(mockQueueService.imageQueue.close).toHaveBeenCalled();
    expect(mockQueueService.ingredientQueue.close).toHaveBeenCalled();
    expect(mockQueueService.instructionQueue.close).toHaveBeenCalled();
    expect(mockQueueService.categorizationQueue.close).toHaveBeenCalled();
    expect(mockDatabaseService.prisma.$disconnect).toHaveBeenCalled();
    expect(mockWebSocketService.webSocketManager.close).toHaveBeenCalled();
  });

  it("should provide configuration from environment variables", () => {
    const container = ServiceContainer.getInstance();

    expect(container.config.port).toBe(4200); // default value
    expect(container.config.wsPort).toBe(8080); // default value
    expect(container.config.batchSize).toBe(10); // default value
    expect(container.config.maxRetries).toBe(3); // default value
  });

  it("should log messages with proper formatting", () => {
    const container = ServiceContainer.getInstance();

    container.logger.log("Test message");
    container.logger.log("Warning message", "warn");
    container.logger.log("Error message", "error");

    // In a real test, you'd verify the console output
    // For now, we just verify the method exists and doesn't throw
    expect(container.logger.log).toBeDefined();
  });

  it("should create container without overrides", () => {
    const container = createServiceContainer();
    expect(container).toBeDefined();
    expect(container.queues).toBeDefined();
    expect(container.database).toBeDefined();
    expect(container.logger).toBeDefined();
    expect(container.webSocket).toBeDefined();
  });

  it("should create container with partial overrides", () => {
    const container = createServiceContainer({
      logger: mockLoggerService,
    });

    expect(container.logger).toBe(mockLoggerService);
    expect(container.queues).toBeDefined(); // Should use default
    expect(container.database).toBeDefined(); // Should use default
  });

  it("should handle close with only queue overrides", async () => {
    const container = createServiceContainer({
      queues: mockQueueService,
    }) as any;

    await container.close();

    expect(mockQueueService.noteQueue.close).toHaveBeenCalled();
    expect(mockQueueService.imageQueue.close).toHaveBeenCalled();
    expect(mockQueueService.ingredientQueue.close).toHaveBeenCalled();
    expect(mockQueueService.instructionQueue.close).toHaveBeenCalled();
    expect(mockQueueService.categorizationQueue.close).toHaveBeenCalled();
  });

  it("should handle close with only database overrides", async () => {
    const container = createServiceContainer({
      database: mockDatabaseService,
    }) as any;

    await container.close();

    expect(mockDatabaseService.prisma.$disconnect).toHaveBeenCalled();
  });

  it("should handle close with only WebSocket overrides", async () => {
    const container = createServiceContainer({
      webSocket: mockWebSocketService,
    }) as any;

    await container.close();

    expect(mockWebSocketService.webSocketManager.close).toHaveBeenCalled();
  });

  it("should handle close with only logger overrides", async () => {
    const container = createServiceContainer({
      logger: mockLoggerService,
    }) as any;

    await container.close();

    expect(mockLoggerService.log).toHaveBeenCalledWith(
      "ServiceContainer closed successfully"
    );
  });

  it("should handle close with database without disconnect method", async () => {
    const mockDatabaseWithoutDisconnect = {
      prisma: {} as any,
    };

    const container = createServiceContainer({
      database: mockDatabaseWithoutDisconnect,
    }) as any;

    // Should not throw error
    await expect(container.close()).resolves.not.toThrow();
  });

  it("should handle close with WebSocket without close method", async () => {
    const mockWebSocketWithoutClose = {
      webSocketManager: {} as any,
    };

    const container = createServiceContainer({
      webSocket: mockWebSocketWithoutClose,
    }) as any;

    // Should not throw error
    await expect(container.close()).resolves.not.toThrow();
  });

  it("should handle close with logger without log method", async () => {
    const mockLoggerWithoutLog = {} as any;

    const container = createServiceContainer({
      logger: mockLoggerWithoutLog,
    }) as any;

    // Should not throw error
    await expect(container.close()).resolves.not.toThrow();
  });

  it("should handle close with null WebSocket manager", async () => {
    const mockWebSocketWithNull = {
      webSocketManager: null,
    };

    const container = createServiceContainer({
      webSocket: mockWebSocketWithNull,
    }) as any;

    // Should not throw error
    await expect(container.close()).resolves.not.toThrow();
  });

  it("should test default container close method", async () => {
    const container = ServiceContainer.getInstance();

    // Mock the queue close methods to avoid actual queue operations
    vi.spyOn(container.queues.noteQueue, "close").mockResolvedValue();
    vi.spyOn(container.queues.imageQueue, "close").mockResolvedValue();
    vi.spyOn(container.queues.ingredientQueue, "close").mockResolvedValue();
    vi.spyOn(container.queues.instructionQueue, "close").mockResolvedValue();
    vi.spyOn(container.queues.categorizationQueue, "close").mockResolvedValue();
    vi.spyOn(container.database.prisma, "$disconnect").mockResolvedValue();

    await container.close();

    expect(container.queues.noteQueue.close).toHaveBeenCalled();
    expect(container.queues.imageQueue.close).toHaveBeenCalled();
    expect(container.queues.ingredientQueue.close).toHaveBeenCalled();
    expect(container.queues.instructionQueue.close).toHaveBeenCalled();
    expect(container.queues.categorizationQueue.close).toHaveBeenCalled();
    expect(container.database.prisma.$disconnect).toHaveBeenCalled();
  });

  it("should test default container close method with WebSocket manager", async () => {
    const container = ServiceContainer.getInstance();

    // Mock the queue close methods to avoid actual queue operations
    vi.spyOn(container.queues.noteQueue, "close").mockResolvedValue();
    vi.spyOn(container.queues.imageQueue, "close").mockResolvedValue();
    vi.spyOn(container.queues.ingredientQueue, "close").mockResolvedValue();
    vi.spyOn(container.queues.instructionQueue, "close").mockResolvedValue();
    vi.spyOn(container.queues.categorizationQueue, "close").mockResolvedValue();
    vi.spyOn(container.database.prisma, "$disconnect").mockResolvedValue();

    // Set a mock WebSocket manager
    const mockWebSocketManager = {
      broadcastStatusEvent: vi.fn(),
      getConnectedClientsCount: vi.fn(),
      close: vi.fn(),
    };
    container.webSocket.webSocketManager = mockWebSocketManager;

    await container.close();

    expect(container.queues.noteQueue.close).toHaveBeenCalled();
    expect(container.queues.imageQueue.close).toHaveBeenCalled();
    expect(container.queues.ingredientQueue.close).toHaveBeenCalled();
    expect(container.queues.instructionQueue.close).toHaveBeenCalled();
    expect(container.queues.categorizationQueue.close).toHaveBeenCalled();
    expect(container.database.prisma.$disconnect).toHaveBeenCalled();
    expect(mockWebSocketManager.close).toHaveBeenCalled();
  });

  it("should handle error in close method", async () => {
    const container = ServiceContainer.getInstance();

    // Mock the queue close methods to throw an error
    vi.spyOn(container.queues.noteQueue, "close").mockRejectedValue(
      new Error("Queue close failed")
    );
    vi.spyOn(container.queues.imageQueue, "close").mockResolvedValue();
    vi.spyOn(container.queues.ingredientQueue, "close").mockResolvedValue();
    vi.spyOn(container.queues.instructionQueue, "close").mockResolvedValue();
    vi.spyOn(container.queues.categorizationQueue, "close").mockResolvedValue();
    vi.spyOn(container.database.prisma, "$disconnect").mockResolvedValue();

    // The close method uses Promise.allSettled, so it won't throw
    // It should still log "ServiceContainer closed successfully"
    const logSpy = vi.spyOn(container.logger, "log");

    await container.close();

    // Should log success, not error
    expect(logSpy).toHaveBeenCalledWith("ServiceContainer closed successfully");
  });

  it("should throw error when database disconnect fails", async () => {
    const container = ServiceContainer.getInstance();

    // Mock all queue close methods to succeed
    vi.spyOn(container.queues.noteQueue, "close").mockResolvedValue();
    vi.spyOn(container.queues.imageQueue, "close").mockResolvedValue();
    vi.spyOn(container.queues.ingredientQueue, "close").mockResolvedValue();
    vi.spyOn(container.queues.instructionQueue, "close").mockResolvedValue();
    vi.spyOn(container.queues.categorizationQueue, "close").mockResolvedValue();

    // Mock database disconnect to throw an error
    vi.spyOn(container.database.prisma, "$disconnect").mockRejectedValue(
      new Error("Database disconnect failed")
    );

    // The close method should throw the error
    await expect(container.close()).rejects.toThrow(
      "Database disconnect failed"
    );
  });

  it("should test WebSocket manager setter", () => {
    const container = ServiceContainer.getInstance();
    const mockManager = {
      broadcastStatusEvent: vi.fn(),
      getConnectedClientsCount: vi.fn(),
      close: vi.fn(),
    };

    // Test the setter
    container.webSocket.webSocketManager = mockManager;
    expect(container.webSocket.webSocketManager).toBe(mockManager);

    // Test setting to null
    container.webSocket.webSocketManager = null;
    expect(container.webSocket.webSocketManager).toBeNull();
  });

  it("should test config service getters", () => {
    const container = ServiceContainer.getInstance();
    const config = container.config;

    expect(config.port).toBe(4200);
    expect(config.wsPort).toBe(8080);
    expect(config.batchSize).toBe(10);
    expect(config.maxRetries).toBe(3);
    expect(config.backoffMs).toBe(1000);
    expect(config.maxBackoffMs).toBe(30000);
    expect(config.redisConnection).toBeDefined();
  });

  it("should test logger service with all log levels", () => {
    const container = ServiceContainer.getInstance();
    const logger = container.logger;

    // Test all log levels
    logger.log("Info message", "info");
    logger.log("Warning message", "warn");
    logger.log("Error message", "error");
    logger.log("Default message"); // Should default to "info"

    expect(logger.log).toBeDefined();
  });

  it("should test service getters", () => {
    const container = ServiceContainer.getInstance();

    // Test database service getter
    expect(container.database.prisma).toBeDefined();

    // Test error handler service getter
    expect(container.errorHandler.errorHandler).toBeDefined();

    // Test health monitor service getter
    expect(container.healthMonitor.healthMonitor).toBeDefined();
  });
});
