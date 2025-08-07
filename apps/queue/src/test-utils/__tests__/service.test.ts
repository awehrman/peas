import type { PrismaClient } from "@peas/database";
import type { Queue } from "bullmq";
import { describe, expect, it, vi } from "vitest";

import type {
  IConfigService,
  IErrorHandlerService,
  IHealthMonitorService,
  ILoggerService,
  IStatusBroadcasterService,
  IWebSocketService,
} from "../../services/container";
import type { PatternTracker } from "../../workers/shared/pattern-tracker";
import {
  clearServiceMocks,
  createMockDatabaseService,
  createMockQueueService,
  createMockServiceFactory,
  createMockServiceInstances,
  createTestContext,
  createTestError,
  setupAllServiceMocks,
  setupRegistrationMocks,
  setupServiceFactoryMocks,
  testConfigInterface,
  testDatabaseInterface,
  testErrorHandlerInterface,
  testHealthMonitorInterface,
  testLoggerInterface,
  testQueueInterface,
  testStatusBroadcasterInterface,
  testWebSocketInterface,
} from "../service";

// ============================================================================
// TYPE DEFINITIONS FOR TESTING
// ============================================================================

type MockHealthMonitor = {
  isHealthy: ReturnType<typeof vi.fn>;
};

type MockWebSocketManager = {
  broadcast: ReturnType<typeof vi.fn>;
};

// ============================================================================
// SERVICE MOCK UTILITIES TESTS
// ============================================================================

describe("Service Mock Utilities", () => {
  describe("createMockServiceFactory", () => {
    it("should create mock service factory with all required functions", () => {
      const factory = createMockServiceFactory();

      expect(factory).toHaveProperty("createErrorHandler");
      expect(factory).toHaveProperty("createHealthMonitor");
      expect(factory).toHaveProperty("createWebSocketService");
      expect(factory).toHaveProperty("createStatusBroadcaster");
      expect(factory).toHaveProperty("createLoggerService");
      expect(factory).toHaveProperty("createConfigService");

      expect(typeof factory.createErrorHandler).toBe("function");
      expect(typeof factory.createHealthMonitor).toBe("function");
      expect(typeof factory.createWebSocketService).toBe("function");
      expect(typeof factory.createStatusBroadcaster).toBe("function");
      expect(typeof factory.createLoggerService).toBe("function");
      expect(typeof factory.createConfigService).toBe("function");
    });

    it("should create vi.fn() mocks for all factory functions", () => {
      const factory = createMockServiceFactory();

      expect(vi.isMockFunction(factory.createErrorHandler)).toBe(true);
      expect(vi.isMockFunction(factory.createHealthMonitor)).toBe(true);
      expect(vi.isMockFunction(factory.createWebSocketService)).toBe(true);
      expect(vi.isMockFunction(factory.createStatusBroadcaster)).toBe(true);
      expect(vi.isMockFunction(factory.createLoggerService)).toBe(true);
      expect(vi.isMockFunction(factory.createConfigService)).toBe(true);
    });
  });

  describe("createMockServiceInstances", () => {
    it("should create mock service instances with all required properties", () => {
      const instances = createMockServiceInstances();

      // Test error handler
      expect(instances.errorHandler).toHaveProperty("withErrorHandling");
      expect(instances.errorHandler).toHaveProperty("createJobError");
      expect(instances.errorHandler).toHaveProperty("classifyError");
      expect(instances.errorHandler).toHaveProperty("logError");

      // Test health monitor
      expect(instances.healthMonitor).toHaveProperty("healthMonitor");
      expect(instances.healthMonitor.healthMonitor).toHaveProperty("isHealthy");

      // Test web socket
      expect(instances.webSocket).toHaveProperty("webSocketManager");
      expect(instances.webSocket.webSocketManager).toHaveProperty("broadcast");

      // Test status broadcaster
      expect(instances.statusBroadcaster).toHaveProperty(
        "addStatusEventAndBroadcast"
      );

      // Test logger
      expect(instances.logger).toHaveProperty("log");

      // Test config
      expect(instances.config).toHaveProperty("wsHost");
      expect(instances.config).toHaveProperty("port");
      expect(instances.config).toHaveProperty("wsPort");
    });

    it("should create vi.fn() mocks for all service methods", () => {
      const instances = createMockServiceInstances();

      expect(vi.isMockFunction(instances.errorHandler.withErrorHandling)).toBe(
        true
      );
      expect(vi.isMockFunction(instances.errorHandler.createJobError)).toBe(
        true
      );
      expect(vi.isMockFunction(instances.errorHandler.classifyError)).toBe(
        true
      );
      expect(vi.isMockFunction(instances.errorHandler.logError)).toBe(true);
      expect(
        vi.isMockFunction(
          (instances.healthMonitor.healthMonitor as MockHealthMonitor).isHealthy
        )
      ).toBe(true);
      expect(
        vi.isMockFunction(
          (instances.webSocket.webSocketManager as MockWebSocketManager)
            .broadcast
        )
      ).toBe(true);
      expect(
        vi.isMockFunction(
          instances.statusBroadcaster.addStatusEventAndBroadcast
        )
      ).toBe(true);
      expect(vi.isMockFunction(instances.logger.log)).toBe(true);
    });

    it("should have correct config values", () => {
      const instances = createMockServiceInstances();

      expect(instances.config.wsHost).toBe("localhost");
      expect(instances.config.port).toBe(3000);
      expect(instances.config.wsPort).toBe(8080);
    });
  });

  describe("createMockDatabaseService", () => {
    it("should create mock database service with required properties", () => {
      const database = createMockDatabaseService();

      expect(database).toHaveProperty("prisma");
      expect(database).toHaveProperty("patternTracker");

      expect(database.prisma).toHaveProperty("$disconnect");
      expect(typeof database.prisma.$disconnect).toBe("function");
    });

    it("should create vi.fn() mock for prisma disconnect", () => {
      const database = createMockDatabaseService();

      expect(vi.isMockFunction(database.prisma.$disconnect)).toBe(true);
    });
  });

  describe("createMockQueueService", () => {
    it("should create mock queue service with all required queues", () => {
      const queues = createMockQueueService();

      expect(queues).toHaveProperty("noteQueue");
      expect(queues).toHaveProperty("imageQueue");
      expect(queues).toHaveProperty("ingredientQueue");
      expect(queues).toHaveProperty("instructionQueue");
      expect(queues).toHaveProperty("categorizationQueue");
      expect(queues).toHaveProperty("sourceQueue");
    });

    it("should have correct queue names", () => {
      const queues = createMockQueueService();

      expect(queues.noteQueue.name).toBe("note");
      expect(queues.imageQueue.name).toBe("image");
      expect(queues.ingredientQueue.name).toBe("ingredient");
      expect(queues.instructionQueue.name).toBe("instruction");
      expect(queues.categorizationQueue.name).toBe("categorization");
      expect(queues.sourceQueue.name).toBe("source");
    });
  });

  describe("setupServiceFactoryMocks", () => {
    it("should setup service factory mocks with default implementations", () => {
      const { mockFactory, mockInstances } = setupServiceFactoryMocks();

      // Verify factory functions return the expected instances
      expect(mockFactory.createErrorHandler()).toBe(mockInstances.errorHandler);
      expect(mockFactory.createHealthMonitor()).toBe(
        mockInstances.healthMonitor
      );
      expect(mockFactory.createWebSocketService()).toBe(
        mockInstances.webSocket
      );
      expect(mockFactory.createStatusBroadcaster()).toBe(
        mockInstances.statusBroadcaster
      );
      expect(mockFactory.createLoggerService()).toBe(mockInstances.logger);
      expect(mockFactory.createConfigService()).toBe(mockInstances.config);
    });

    it("should return both factory and instances", () => {
      const result = setupServiceFactoryMocks();

      expect(result).toHaveProperty("mockFactory");
      expect(result).toHaveProperty("mockInstances");
      expect(typeof result.mockFactory.createErrorHandler).toBe("function");
      expect(result.mockInstances.errorHandler).toBeDefined();
    });
  });

  describe("setupRegistrationMocks", () => {
    it("should setup registration mocks with default implementations", () => {
      const {
        mockRegisterDatabase,
        mockRegisterQueues,
        mockDatabase,
        mockQueues,
      } = setupRegistrationMocks();

      // Verify registration functions return the expected services
      expect(mockRegisterDatabase()).toBe(mockDatabase);
      expect(mockRegisterQueues()).toBe(mockQueues);
    });

    it("should return all registration components", () => {
      const result = setupRegistrationMocks();

      expect(result).toHaveProperty("mockRegisterDatabase");
      expect(result).toHaveProperty("mockRegisterQueues");
      expect(result).toHaveProperty("mockDatabase");
      expect(result).toHaveProperty("mockQueues");

      expect(typeof result.mockRegisterDatabase).toBe("function");
      expect(typeof result.mockRegisterQueues).toBe("function");
      expect(result.mockDatabase).toBeDefined();
      expect(result.mockQueues).toBeDefined();
    });
  });
});

// ============================================================================
// SERVICE INTERFACE TESTING UTILITIES TESTS
// ============================================================================

describe("Service Interface Testing Utilities", () => {
  describe("testErrorHandlerInterface", () => {
    it("should test error handler interface compliance", () => {
      const errorHandler = {
        withErrorHandling: vi.fn(),
        createJobError: vi.fn(),
        classifyError: vi.fn(),
        logError: vi.fn(),
      };

      expect(() => testErrorHandlerInterface(errorHandler)).not.toThrow();
    });

    it("should fail when error handler is missing required properties", () => {
      const invalidErrorHandler: Partial<IErrorHandlerService> = {
        withErrorHandling: vi.fn(),
        // Missing other required properties
      };

      expect(() =>
        testErrorHandlerInterface(invalidErrorHandler as IErrorHandlerService)
      ).toThrow();
    });
  });

  describe("testHealthMonitorInterface", () => {
    it("should test health monitor interface compliance", () => {
      const healthMonitor = {
        healthMonitor: {
          isHealthy: vi.fn(),
        },
      };

      expect(() => testHealthMonitorInterface(healthMonitor)).not.toThrow();
    });

    it("should fail when health monitor is missing required properties", () => {
      const invalidHealthMonitor: Partial<IHealthMonitorService> = {};

      expect(() =>
        testHealthMonitorInterface(
          invalidHealthMonitor as IHealthMonitorService
        )
      ).toThrow();
    });
  });

  describe("testWebSocketInterface", () => {
    it("should test web socket interface compliance", () => {
      const webSocket = {
        webSocketManager: {
          broadcast: vi.fn(),
        },
      };

      expect(() => testWebSocketInterface(webSocket)).not.toThrow();
    });

    it("should fail when web socket is missing required properties", () => {
      const invalidWebSocket: Partial<IWebSocketService> = {};

      expect(() =>
        testWebSocketInterface(invalidWebSocket as IWebSocketService)
      ).toThrow();
    });
  });

  describe("testStatusBroadcasterInterface", () => {
    it("should test status broadcaster interface compliance", () => {
      const statusBroadcaster = {
        addStatusEventAndBroadcast: vi.fn(),
      };

      expect(() =>
        testStatusBroadcasterInterface(statusBroadcaster)
      ).not.toThrow();
    });

    it("should fail when status broadcaster is missing required properties", () => {
      const invalidStatusBroadcaster: Partial<IStatusBroadcasterService> = {};

      expect(() =>
        testStatusBroadcasterInterface(
          invalidStatusBroadcaster as IStatusBroadcasterService
        )
      ).toThrow();
    });
  });

  describe("testLoggerInterface", () => {
    it("should test logger interface compliance", () => {
      const logger = {
        log: vi.fn(),
      };

      expect(() => testLoggerInterface(logger)).not.toThrow();
    });

    it("should fail when logger is missing required properties", () => {
      const invalidLogger: Partial<ILoggerService> = {};

      expect(() =>
        testLoggerInterface(invalidLogger as ILoggerService)
      ).toThrow();
    });
  });

  describe("testConfigInterface", () => {
    it("should test config interface compliance", () => {
      const config = {
        wsHost: "localhost",
        port: 3000,
        wsPort: 8080,
      };

      expect(() => testConfigInterface(config)).not.toThrow();
    });

    it("should fail when config is missing required properties", () => {
      const invalidConfig: Partial<IConfigService> = {
        wsHost: "localhost",
        // Missing port and wsPort
      };

      expect(() =>
        testConfigInterface(invalidConfig as IConfigService)
      ).toThrow();
    });
  });

  describe("testQueueInterface", () => {
    it("should test queue interface compliance", () => {
      const queues = {
        noteQueue: { name: "note" } as Queue,
        imageQueue: { name: "image" } as Queue,
        ingredientQueue: { name: "ingredient" } as Queue,
        instructionQueue: { name: "instruction" } as Queue,
        categorizationQueue: { name: "categorization" } as Queue,
        sourceQueue: { name: "source" } as Queue,
        patternTrackingQueue: { name: "patternTracking" } as Queue,
      };

      expect(() => testQueueInterface(queues)).not.toThrow();
    });

    it("should fail when queues are missing required properties", () => {
      const invalidQueues: Partial<{
        noteQueue: Queue;
        imageQueue: Queue;
        ingredientQueue: Queue;
        instructionQueue: Queue;
        categorizationQueue: Queue;
        sourceQueue: Queue;
        patternTrackingQueue: Queue;
      }> = {
        noteQueue: { name: "note" } as Queue,
        // Missing other queues
      };

      expect(() =>
        testQueueInterface(
          invalidQueues as {
            noteQueue: Queue;
            imageQueue: Queue;
            ingredientQueue: Queue;
            instructionQueue: Queue;
            categorizationQueue: Queue;
            sourceQueue: Queue;
            patternTrackingQueue: Queue;
          }
        )
      ).toThrow();
    });
  });

  describe("testDatabaseInterface", () => {
    it("should test database interface compliance", () => {
      const database = {
        prisma: { $disconnect: vi.fn() } as unknown as PrismaClient,
        patternTracker: {} as PatternTracker,
      };

      expect(() => testDatabaseInterface(database)).not.toThrow();
    });

    it("should fail when database is missing required properties", () => {
      const invalidDatabase: Partial<{
        prisma: PrismaClient;
        patternTracker: PatternTracker;
      }> = {
        prisma: { $disconnect: vi.fn() } as unknown as PrismaClient,
        // Missing patternTracker
      };

      expect(() =>
        testDatabaseInterface(
          invalidDatabase as {
            prisma: PrismaClient;
            patternTracker: PatternTracker;
          }
        )
      ).toThrow();
    });
  });
});

// ============================================================================
// COMMON TEST CONTEXTS TESTS
// ============================================================================

describe("Common Test Contexts", () => {
  describe("createTestContext", () => {
    it("should create test context with default operation", () => {
      const context = createTestContext();

      expect(context).toHaveProperty("operation");
      expect(context).toHaveProperty("timestamp");

      expect(context.operation).toBe("test");
      expect(context.timestamp).toBeInstanceOf(Date);
    });

    it("should create test context with custom operation", () => {
      const customOperation = "custom-test";
      const context = createTestContext(customOperation);

      expect(context.operation).toBe(customOperation);
      expect(context.timestamp).toBeInstanceOf(Date);
    });

    it("should create unique timestamps for each call", async () => {
      const context1 = createTestContext();
      await new Promise((r) => setTimeout(r, 2));
      const context2 = createTestContext();

      expect(context1.timestamp.getTime()).not.toEqual(
        context2.timestamp.getTime()
      );
    });
  });

  describe("createTestError", () => {
    it("should create test error with default message", () => {
      const error = createTestError();

      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe("Test error");
      expect(error.name).toBe("Error");
    });

    it("should create test error with custom message", () => {
      const customMessage = "Custom test error";
      const error = createTestError(customMessage);

      expect(error.message).toBe(customMessage);
      expect(error.name).toBe("Error");
    });

    it("should create test error with custom name", () => {
      const customName = "CustomError";
      const error = createTestError("Test error", customName);

      expect(error.message).toBe("Test error");
      expect(error.name).toBe(customName);
    });

    it("should create test error with both custom message and name", () => {
      const customMessage = "Custom test error";
      const customName = "CustomError";
      const error = createTestError(customMessage, customName);

      expect(error.message).toBe(customMessage);
      expect(error.name).toBe(customName);
    });
  });
});

// ============================================================================
// MOCK SETUP HELPERS TESTS
// ============================================================================

describe("Mock Setup Helpers", () => {
  describe("setupAllServiceMocks", () => {
    it("should setup all service mocks", () => {
      const mocks = setupAllServiceMocks();

      expect(mocks).toHaveProperty("mockFactory");
      expect(mocks).toHaveProperty("mockInstances");
      expect(mocks).toHaveProperty("mockRegisterDatabase");
      expect(mocks).toHaveProperty("mockRegisterQueues");
      expect(mocks).toHaveProperty("mockDatabase");
      expect(mocks).toHaveProperty("mockQueues");
    });

    it("should return properly configured mocks", () => {
      const mocks = setupAllServiceMocks();

      // Test that factory functions work
      expect(mocks.mockFactory.createErrorHandler()).toBe(
        mocks.mockInstances.errorHandler
      );
      expect(mocks.mockRegisterDatabase()).toBe(mocks.mockDatabase);
      expect(mocks.mockRegisterQueues()).toBe(mocks.mockQueues);
    });

    it("should return all required mock components", () => {
      const mocks = setupAllServiceMocks();

      // Verify all components are defined
      expect(mocks.mockFactory).toBeDefined();
      expect(mocks.mockInstances).toBeDefined();
      expect(mocks.mockRegisterDatabase).toBeDefined();
      expect(mocks.mockRegisterQueues).toBeDefined();
      expect(mocks.mockDatabase).toBeDefined();
      expect(mocks.mockQueues).toBeDefined();
    });
  });

  describe("clearServiceMocks", () => {
    it("should clear all service mocks", () => {
      // Setup some mocks first
      const { mockFactory } = setupServiceFactoryMocks();
      mockFactory.createErrorHandler.mockReturnValue({});

      // Clear mocks
      clearServiceMocks();

      // Verify mocks are cleared
      expect(mockFactory.createErrorHandler).not.toHaveBeenCalled();
    });

    it("should not throw when called", () => {
      expect(() => clearServiceMocks()).not.toThrow();
    });
  });
});

// ============================================================================
// INTEGRATION TESTS
// ============================================================================

describe("Integration Tests", () => {
  describe("Full service mock setup and usage", () => {
    it("should work with complete service setup", () => {
      const mocks = setupAllServiceMocks();

      // Test factory functions
      const errorHandler = mocks.mockFactory.createErrorHandler();
      const healthMonitor = mocks.mockFactory.createHealthMonitor();
      const webSocket = mocks.mockFactory.createWebSocketService();

      expect(errorHandler).toBe(mocks.mockInstances.errorHandler);
      expect(healthMonitor).toBe(mocks.mockInstances.healthMonitor);
      expect(webSocket).toBe(mocks.mockInstances.webSocket);

      // Test registration functions
      const database = mocks.mockRegisterDatabase();
      const queues = mocks.mockRegisterQueues();

      expect(database).toBe(mocks.mockDatabase);
      expect(queues).toBe(mocks.mockQueues);

      // Test interface compliance
      expect(() => testErrorHandlerInterface(errorHandler)).not.toThrow();
      expect(() => testHealthMonitorInterface(healthMonitor)).not.toThrow();
      expect(() => testWebSocketInterface(webSocket)).not.toThrow();
      expect(() => testQueueInterface(queues)).not.toThrow();
      expect(() => testDatabaseInterface(database)).not.toThrow();
    });

    it("should allow mock function calls", () => {
      const { mockInstances } = setupServiceFactoryMocks();

      // Test that mock functions can be called
      (
        mockInstances.errorHandler.withErrorHandling as ReturnType<typeof vi.fn>
      )();
      mockInstances.logger.log("test message");
      (
        mockInstances.healthMonitor.healthMonitor as MockHealthMonitor
      ).isHealthy();

      expect(
        mockInstances.errorHandler.withErrorHandling
      ).toHaveBeenCalledTimes(1);
      expect(mockInstances.logger.log).toHaveBeenCalledWith("test message");
      expect(
        (mockInstances.healthMonitor.healthMonitor as MockHealthMonitor)
          .isHealthy
      ).toHaveBeenCalledTimes(1);
    });
  });

  describe("Test context and error creation integration", () => {
    it("should work with test context and error creation", () => {
      const context = createTestContext("integration-test");
      const error = createTestError(
        "Integration test error",
        "IntegrationError"
      );

      expect(context.operation).toBe("integration-test");
      expect(error.message).toBe("Integration test error");
      expect(error.name).toBe("IntegrationError");
    });
  });
});
