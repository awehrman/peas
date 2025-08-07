import type { PrismaClient } from "@peas/database";
import type { Queue } from "bullmq";
import { expect, vi } from "vitest";

import type {
  IConfigService,
  IErrorHandlerService,
  IHealthMonitorService,
  ILoggerService,
  IStatusBroadcasterService,
  IWebSocketService,
} from "../services/container";
import type { PatternTracker } from "../workers/shared/pattern-tracker";

// ============================================================================
// SERVICE MOCK UTILITIES
// ============================================================================

/**
 * Create mock service factory functions for testing
 */
export function createMockServiceFactory() {
  return {
    createErrorHandler: vi.fn(),
    createHealthMonitor: vi.fn(),
    createWebSocketService: vi.fn(),
    createStatusBroadcaster: vi.fn(),
    createLoggerService: vi.fn(),
    createConfigService: vi.fn(),
  };
}

/**
 * Create mock service instances for testing
 */
export function createMockServiceInstances() {
  return {
    errorHandler: {
      withErrorHandling: vi.fn(),
      createJobError: vi.fn(),
      classifyError: vi.fn(),
      logError: vi.fn(),
    } as IErrorHandlerService,
    healthMonitor: {
      healthMonitor: { isHealthy: vi.fn() },
    } as IHealthMonitorService,
    webSocket: {
      webSocketManager: { broadcast: vi.fn() },
    } as IWebSocketService,
    statusBroadcaster: {
      addStatusEventAndBroadcast: vi.fn(),
    } as IStatusBroadcasterService,
    logger: {
      log: vi.fn(),
    } as ILoggerService,
    config: {
      wsHost: "localhost",
      port: 3000,
      wsPort: 8080,
    } as IConfigService,
  };
}

/**
 * Create mock database service for testing
 */
export function createMockDatabaseService() {
  return {
    prisma: { $disconnect: vi.fn() } as Partial<PrismaClient> as PrismaClient,
    patternTracker: {} as PatternTracker,
  };
}

/**
 * Create mock queue service for testing
 */
export function createMockQueueService() {
  return {
    noteQueue: { name: "note" } as Partial<Queue> as Queue,
    imageQueue: { name: "image" } as Partial<Queue> as Queue,
    ingredientQueue: { name: "ingredient" } as Partial<Queue> as Queue,
    instructionQueue: { name: "instruction" } as Partial<Queue> as Queue,
    categorizationQueue: { name: "categorization" } as Partial<Queue> as Queue,
    sourceQueue: { name: "source" } as Partial<Queue> as Queue,
    patternTrackingQueue: { name: "patternTracking" } as Partial<Queue> as Queue,
  };
}

/**
 * Setup service factory mocks with default implementations
 */
export function setupServiceFactoryMocks() {
  const mockFactory = createMockServiceFactory();
  const mockInstances = createMockServiceInstances();

  // Setup default mock implementations
  mockFactory.createErrorHandler.mockReturnValue(mockInstances.errorHandler);
  mockFactory.createHealthMonitor.mockReturnValue(mockInstances.healthMonitor);
  mockFactory.createWebSocketService.mockReturnValue(mockInstances.webSocket);
  mockFactory.createStatusBroadcaster.mockReturnValue(
    mockInstances.statusBroadcaster
  );
  mockFactory.createLoggerService.mockReturnValue(mockInstances.logger);
  mockFactory.createConfigService.mockReturnValue(mockInstances.config);

  return { mockFactory, mockInstances };
}

/**
 * Setup database and queue registration mocks
 */
export function setupRegistrationMocks() {
  const mockRegisterDatabase = vi.fn();
  const mockRegisterQueues = vi.fn();

  const mockDatabase = createMockDatabaseService();
  const mockQueues = createMockQueueService();

  mockRegisterDatabase.mockReturnValue(mockDatabase);
  mockRegisterQueues.mockReturnValue(mockQueues);

  return {
    mockRegisterDatabase,
    mockRegisterQueues,
    mockDatabase,
    mockQueues,
  };
}

// ============================================================================
// SERVICE INTERFACE TESTING UTILITIES
// ============================================================================

/**
 * Test interface compliance for error handler service
 */
export function testErrorHandlerInterface(errorHandler: IErrorHandlerService) {
  expect(errorHandler).toHaveProperty("withErrorHandling");
  expect(errorHandler).toHaveProperty("createJobError");
  expect(errorHandler).toHaveProperty("classifyError");
  expect(errorHandler).toHaveProperty("logError");
}

/**
 * Test interface compliance for health monitor service
 */
export function testHealthMonitorInterface(
  healthMonitor: IHealthMonitorService
) {
  expect(healthMonitor).toHaveProperty("healthMonitor");
}

/**
 * Test interface compliance for web socket service
 */
export function testWebSocketInterface(webSocket: IWebSocketService) {
  expect(webSocket).toHaveProperty("webSocketManager");
}

/**
 * Test interface compliance for status broadcaster service
 */
export function testStatusBroadcasterInterface(
  statusBroadcaster: IStatusBroadcasterService
) {
  expect(statusBroadcaster).toHaveProperty("addStatusEventAndBroadcast");
}

/**
 * Test interface compliance for logger service
 */
export function testLoggerInterface(logger: ILoggerService) {
  expect(logger).toHaveProperty("log");
}

/**
 * Test interface compliance for config service
 */
export function testConfigInterface(config: IConfigService) {
  expect(config).toHaveProperty("wsHost");
  expect(config).toHaveProperty("port");
  expect(config).toHaveProperty("wsPort");
}

/**
 * Test interface compliance for queue service
 */
export function testQueueInterface(queues: {
  noteQueue: Queue;
  imageQueue: Queue;
  ingredientQueue: Queue;
  instructionQueue: Queue;
  categorizationQueue: Queue;
  sourceQueue: Queue;
  patternTrackingQueue: Queue;
}) {
  expect(queues).toHaveProperty("noteQueue");
  expect(queues).toHaveProperty("imageQueue");
  expect(queues).toHaveProperty("ingredientQueue");
  expect(queues).toHaveProperty("instructionQueue");
  expect(queues).toHaveProperty("categorizationQueue");
  expect(queues).toHaveProperty("sourceQueue");
  expect(queues).toHaveProperty("patternTrackingQueue");
}

/**
 * Test interface compliance for database service
 */
export function testDatabaseInterface(database: {
  prisma: PrismaClient;
  patternTracker: PatternTracker;
}) {
  expect(database).toHaveProperty("prisma");
  expect(database).toHaveProperty("patternTracker");
}

// ============================================================================
// COMMON TEST CONTEXTS
// ============================================================================

/**
 * Create a common test context for error handling tests
 */
export function createTestContext(operation: string = "test") {
  return {
    operation,
    timestamp: new Date(),
  };
}

/**
 * Create a common test error for error handling tests
 */
export function createTestError(message: string = "Test error", name?: string) {
  const error = new Error(message);
  if (name) {
    error.name = name;
  }
  return error;
}

// ============================================================================
// MOCK SETUP HELPERS
// ============================================================================

/**
 * Setup all common service mocks for testing
 */
export function setupAllServiceMocks() {
  const { mockFactory, mockInstances } = setupServiceFactoryMocks();
  const { mockRegisterDatabase, mockRegisterQueues, mockDatabase, mockQueues } =
    setupRegistrationMocks();

  return {
    mockFactory,
    mockInstances,
    mockRegisterDatabase,
    mockRegisterQueues,
    mockDatabase,
    mockQueues,
  };
}

/**
 * Clear all service mocks
 */
export function clearServiceMocks() {
  vi.clearAllMocks();
}
