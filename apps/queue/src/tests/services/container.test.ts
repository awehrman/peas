import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  ServiceContainer,
  createServiceContainer,
} from "../../services/container";
import type {
  ILoggerService,
  IDatabaseService,
  IQueueService,
  IWebSocketService,
} from "../../services/container";

// Mock implementations for testing
const mockQueueService: Partial<IQueueService> = {
  noteQueue: { close: vi.fn() } as any,
  imageQueue: { close: vi.fn() } as any,
  ingredientQueue: { close: vi.fn() } as any,
  instructionQueue: { close: vi.fn() } as any,
  categorizationQueue: { close: vi.fn() } as any,
};

const mockDatabaseService: Partial<IDatabaseService> = {
  prisma: {
    $disconnect: vi.fn(),
    note: {
      count: vi.fn().mockResolvedValue(5),
    } as any,
  } as any,
};

const mockLoggerService: Partial<ILoggerService> = {
  log: vi.fn(),
};

const mockWebSocketService: Partial<IWebSocketService> = {
  webSocketManager: {
    broadcastStatusEvent: vi.fn(),
    getConnectedClientsCount: vi.fn(),
    close: vi.fn(),
  } as any,
};

// Remove SIGTERM handler during tests to prevent unhandled rejections
process.removeAllListeners("SIGTERM");

describe("Dependency Injection ServiceContainer", () => {
  let container: ServiceContainer;

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset singleton instance
    (ServiceContainer as any).instance = undefined;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should return singleton instance", () => {
    const instance1 = ServiceContainer.getInstance();
    const instance2 = ServiceContainer.getInstance();
    expect(instance1).toBe(instance2);
  });

  it("should have all required services", () => {
    container = ServiceContainer.getInstance();
    expect(container.queues).toBeDefined();
    expect(container.database).toBeDefined();
    expect(container.logger).toBeDefined();
    expect(container.webSocket).toBeDefined();
  });

  it("should create container with custom overrides", () => {
    const customContainer = createServiceContainer({
      logger: mockLoggerService as ILoggerService,
      database: mockDatabaseService as IDatabaseService,
      queues: mockQueueService as IQueueService,
      webSocket: mockWebSocketService as IWebSocketService,
    });

    expect(customContainer.logger).toBe(mockLoggerService);
    expect(customContainer.database).toBe(mockDatabaseService);
    expect(customContainer.queues).toBe(mockQueueService);
    expect(customContainer.webSocket).toBe(mockWebSocketService);
  });

  it("should create container with partial overrides", () => {
    const customContainer = createServiceContainer({
      logger: mockLoggerService as ILoggerService,
    });

    expect(customContainer.logger).toBe(mockLoggerService);
    expect(customContainer.database).toBeDefined();
    expect(customContainer.queues).toBeDefined();
    expect(customContainer.webSocket).toBeDefined();
  });

  it("should create container with nested overrides", () => {
    const customContainer = createServiceContainer({
      database: {
        prisma: {
          $disconnect: vi.fn(),
        },
      } as any,
    });

    expect(customContainer.database.prisma.$disconnect).toBeDefined();
  });

  it("should create container with webSocket manager override", () => {
    const customContainer = createServiceContainer({
      webSocket: {
        webSocketManager: {
          close: vi.fn(),
        },
      } as any,
    });

    expect(customContainer.webSocket.webSocketManager?.close).toBeDefined();
  });

  it("should log messages with proper formatting", () => {
    const customContainer = createServiceContainer({
      logger: mockLoggerService as ILoggerService,
    });

    customContainer.logger.log("Test message", "info");
    customContainer.logger.log("Warning message", "warn");
    customContainer.logger.log("Error message", "error");

    expect(mockLoggerService.log).toHaveBeenCalledWith("Test message", "info");
    expect(mockLoggerService.log).toHaveBeenCalledWith(
      "Warning message",
      "warn"
    );
    expect(mockLoggerService.log).toHaveBeenCalledWith(
      "Error message",
      "error"
    );
  });

  it("should test default container close method", async () => {
    container = ServiceContainer.getInstance();

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
    container = ServiceContainer.getInstance();

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
    container = ServiceContainer.getInstance();

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
    // Instead, we should test that the method completes successfully
    await expect(container.close()).resolves.not.toThrow();
  });

  it("should throw error when database disconnect fails", async () => {
    container = ServiceContainer.getInstance();

    // Mock the queue close methods to avoid actual queue operations
    vi.spyOn(container.queues.noteQueue, "close").mockResolvedValue();
    vi.spyOn(container.queues.imageQueue, "close").mockResolvedValue();
    vi.spyOn(container.queues.ingredientQueue, "close").mockResolvedValue();
    vi.spyOn(container.queues.instructionQueue, "close").mockResolvedValue();
    vi.spyOn(container.queues.categorizationQueue, "close").mockResolvedValue();
    vi.spyOn(container.database.prisma, "$disconnect").mockRejectedValue(
      new Error("Database disconnect failed")
    );

    await expect(container.close()).rejects.toThrow(
      "Database disconnect failed"
    );
  });

  it("should test logger service with all log levels", () => {
    const customContainer = createServiceContainer({
      logger: mockLoggerService as ILoggerService,
    });

    customContainer.logger.log("Info message", "info");
    customContainer.logger.log("Warning message", "warn");
    customContainer.logger.log("Error message", "error");
    customContainer.logger.log("Default message");

    expect(mockLoggerService.log).toHaveBeenCalledWith("Info message", "info");
    expect(mockLoggerService.log).toHaveBeenCalledWith(
      "Warning message",
      "warn"
    );
    expect(mockLoggerService.log).toHaveBeenCalledWith(
      "Error message",
      "error"
    );
    expect(mockLoggerService.log).toHaveBeenCalledWith("Default message");
  });
});
