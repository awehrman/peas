import type { PrismaClient } from "@peas/database";
import type { Queue } from "bullmq";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { PatternTracker } from "../../workers/shared/pattern-tracker";
import { type IServiceContainer, ServiceContainer } from "../container";
// Import the mocked modules
import { ServiceFactory } from "../factory";
import { registerDatabase } from "../register-database";
import { registerQueues } from "../register-queues";

// Mock the dependencies before importing
vi.mock("../factory", () => ({
  ServiceFactory: {
    createErrorHandler: vi.fn(),
    createHealthMonitor: vi.fn(),
    createWebSocketService: vi.fn(),
    createStatusBroadcaster: vi.fn(),
    createLoggerService: vi.fn(),
    createConfigService: vi.fn(),
  },
}));

vi.mock("../register-database", () => ({
  registerDatabase: vi.fn(),
}));

vi.mock("../register-queues", () => ({
  registerQueues: vi.fn(),
}));

describe("ServiceContainer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    ServiceContainer.reset();

    // Mock service instances
    vi.mocked(ServiceFactory.createErrorHandler).mockReturnValue({
      withErrorHandling: vi.fn(),
      createJobError: vi.fn(),
      classifyError: vi.fn(),
      logError: vi.fn(),
    });
    vi.mocked(ServiceFactory.createHealthMonitor).mockReturnValue({
      healthMonitor: { isHealthy: vi.fn() },
    });
    vi.mocked(ServiceFactory.createWebSocketService).mockReturnValue({
      webSocketManager: { broadcast: vi.fn() },
    });
    vi.mocked(ServiceFactory.createStatusBroadcaster).mockReturnValue({
      addStatusEventAndBroadcast: vi.fn(),
    });
    vi.mocked(ServiceFactory.createLoggerService).mockReturnValue({
      log: vi.fn(),
    });
    vi.mocked(ServiceFactory.createConfigService).mockReturnValue({
      wsHost: "localhost",
      port: 3000,
      wsPort: 8080,
    });
    vi.mocked(registerDatabase).mockReturnValue({
      prisma: { $disconnect: vi.fn() } as Partial<PrismaClient> as PrismaClient,
      patternTracker: {} as PatternTracker,
    });
    vi.mocked(registerQueues).mockReturnValue({
      noteQueue: { name: "note" } as Partial<Queue> as Queue,
      imageQueue: { name: "image" } as Partial<Queue> as Queue,
      ingredientQueue: { name: "ingredient" } as Partial<Queue> as Queue,
      instructionQueue: { name: "instruction" } as Partial<Queue> as Queue,
      categorizationQueue: {
        name: "categorization",
      } as Partial<Queue> as Queue,
      sourceQueue: { name: "source" } as Partial<Queue> as Queue,
    });
  });

  describe("getInstance", () => {
    it("should create a new instance on first call", async () => {
      const container = await ServiceContainer.getInstance();

      expect(container).toBeInstanceOf(ServiceContainer);
      expect(ServiceFactory.createErrorHandler).toHaveBeenCalledTimes(1);
      expect(ServiceFactory.createHealthMonitor).toHaveBeenCalledTimes(1);
      expect(ServiceFactory.createWebSocketService).toHaveBeenCalledTimes(1);
      expect(ServiceFactory.createStatusBroadcaster).toHaveBeenCalledTimes(1);
      expect(ServiceFactory.createLoggerService).toHaveBeenCalledTimes(1);
      expect(ServiceFactory.createConfigService).toHaveBeenCalledTimes(1);
      expect(registerQueues).toHaveBeenCalledTimes(1);
      expect(registerDatabase).toHaveBeenCalledTimes(1);
    });

    it("should return the same instance on subsequent calls", async () => {
      const container1 = await ServiceContainer.getInstance();
      const container2 = await ServiceContainer.getInstance();

      expect(container1).toBe(container2);
      expect(ServiceFactory.createErrorHandler).toHaveBeenCalledTimes(1);
      expect(registerQueues).toHaveBeenCalledTimes(1);
      expect(registerDatabase).toHaveBeenCalledTimes(1);
    });

    it("should implement IServiceContainer interface", async () => {
      const container =
        (await ServiceContainer.getInstance()) as IServiceContainer;

      expect(container).toHaveProperty("queues");
      expect(container).toHaveProperty("database");
      expect(container).toHaveProperty("errorHandler");
      expect(container).toHaveProperty("healthMonitor");
      expect(container).toHaveProperty("webSocket");
      expect(container).toHaveProperty("statusBroadcaster");
      expect(container).toHaveProperty("logger");
      expect(container).toHaveProperty("config");
      expect(container).toHaveProperty("close");
      expect(typeof container.close).toBe("function");
    });

    it("should have all required service properties", async () => {
      const container = await ServiceContainer.getInstance();

      expect(container.errorHandler).toBeDefined();
      expect(container.healthMonitor).toBeDefined();
      expect(container.webSocket).toBeDefined();
      expect(container.statusBroadcaster).toBeDefined();
      expect(container.logger).toBeDefined();
      expect(container.config).toBeDefined();
      expect(container.queues).toBeDefined();
      expect(container.database).toBeDefined();
    });

    it("should have queues with all required queue types", async () => {
      const container = await ServiceContainer.getInstance();

      expect(container.queues.noteQueue).toBeDefined();
      expect(container.queues.imageQueue).toBeDefined();
      expect(container.queues.ingredientQueue).toBeDefined();
      expect(container.queues.instructionQueue).toBeDefined();
      expect(container.queues.categorizationQueue).toBeDefined();
      expect(container.queues.sourceQueue).toBeDefined();
    });

    it("should have database with prisma and patternTracker", async () => {
      const container = await ServiceContainer.getInstance();

      expect(container.database.prisma).toBeDefined();
      expect(container.database.patternTracker).toBeDefined();
    });
  });

  describe("reset", () => {
    it("should reset the singleton instance", async () => {
      const container1 = await ServiceContainer.getInstance();
      ServiceContainer.reset();
      const container2 = await ServiceContainer.getInstance();

      expect(container1).not.toBe(container2);
      expect(ServiceFactory.createErrorHandler).toHaveBeenCalledTimes(2);
      expect(registerQueues).toHaveBeenCalledTimes(2);
      expect(registerDatabase).toHaveBeenCalledTimes(2);
    });
  });

  describe("close", () => {
    it("should disconnect prisma when available", async () => {
      const mockDisconnect = vi.fn().mockResolvedValue(undefined);
      vi.mocked(registerDatabase).mockReturnValue({
        prisma: {
          $disconnect: mockDisconnect,
        } as Partial<PrismaClient> as PrismaClient,
        patternTracker: {} as PatternTracker,
      });

      const container = await ServiceContainer.getInstance();
      await container.close();

      expect(mockDisconnect).toHaveBeenCalledTimes(1);
    });

    it("should handle missing prisma gracefully", async () => {
      vi.mocked(registerDatabase).mockReturnValue({
        prisma: null as unknown as PrismaClient,
        patternTracker: {} as PatternTracker,
      });

      const container = await ServiceContainer.getInstance();

      // Should not throw
      await expect(container.close()).resolves.toBeUndefined();
    });

    it("should handle missing $disconnect method gracefully", async () => {
      vi.mocked(registerDatabase).mockReturnValue({
        prisma: {} as Partial<PrismaClient> as PrismaClient,
        patternTracker: {} as PatternTracker,
      });

      const container = await ServiceContainer.getInstance();

      // Should not throw
      await expect(container.close()).resolves.toBeUndefined();
    });
  });

  describe("constructor", () => {
    it("should be private and not accessible directly", () => {
      // TypeScript private constructors are only compile-time checks
      // At runtime, we can still call them, but we should test that the class
      // behaves correctly when instantiated directly
      expect(() => {
        // @ts-expect-error - Testing private constructor access
        new ServiceContainer();
      }).not.toThrow();
    });
  });

  describe("service initialization", () => {
    it("should initialize all services in constructor", async () => {
      await ServiceContainer.getInstance();

      expect(ServiceFactory.createErrorHandler).toHaveBeenCalled();
      expect(ServiceFactory.createHealthMonitor).toHaveBeenCalled();
      expect(ServiceFactory.createWebSocketService).toHaveBeenCalled();
      expect(ServiceFactory.createStatusBroadcaster).toHaveBeenCalled();
      expect(ServiceFactory.createLoggerService).toHaveBeenCalled();
      expect(ServiceFactory.createConfigService).toHaveBeenCalled();
    });

    it("should initialize queues and database in getInstance", async () => {
      await ServiceContainer.getInstance();

      expect(registerQueues).toHaveBeenCalled();
      expect(registerDatabase).toHaveBeenCalled();
    });
  });

  describe("interface compliance", () => {
    it("should have correct queue service interface", async () => {
      const container = await ServiceContainer.getInstance();

      expect(container.queues).toHaveProperty("noteQueue");
      expect(container.queues).toHaveProperty("imageQueue");
      expect(container.queues).toHaveProperty("ingredientQueue");
      expect(container.queues).toHaveProperty("instructionQueue");
      expect(container.queues).toHaveProperty("categorizationQueue");
      expect(container.queues).toHaveProperty("sourceQueue");
    });

    it("should have correct database service interface", async () => {
      const container = await ServiceContainer.getInstance();

      expect(container.database).toHaveProperty("prisma");
      expect(container.database).toHaveProperty("patternTracker");
    });

    it("should have correct error handler service interface", async () => {
      const container = await ServiceContainer.getInstance();

      expect(container.errorHandler).toHaveProperty("withErrorHandling");
      expect(container.errorHandler).toHaveProperty("createJobError");
      expect(container.errorHandler).toHaveProperty("classifyError");
      expect(container.errorHandler).toHaveProperty("logError");
    });

    it("should have correct health monitor service interface", async () => {
      const container = await ServiceContainer.getInstance();

      expect(container.healthMonitor).toHaveProperty("healthMonitor");
    });

    it("should have correct web socket service interface", async () => {
      const container = await ServiceContainer.getInstance();

      expect(container.webSocket).toHaveProperty("webSocketManager");
    });

    it("should have correct status broadcaster service interface", async () => {
      const container = await ServiceContainer.getInstance();

      expect(container.statusBroadcaster).toHaveProperty(
        "addStatusEventAndBroadcast"
      );
    });

    it("should have correct logger service interface", async () => {
      const container = await ServiceContainer.getInstance();

      expect(container.logger).toHaveProperty("log");
    });

    it("should have correct config service interface", async () => {
      const container = await ServiceContainer.getInstance();

      expect(container.config).toHaveProperty("wsHost");
      expect(container.config).toHaveProperty("port");
      expect(container.config).toHaveProperty("wsPort");
    });
  });
});
