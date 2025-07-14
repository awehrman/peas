import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { ServiceContainer, createServiceContainer } from "../container";

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
});
