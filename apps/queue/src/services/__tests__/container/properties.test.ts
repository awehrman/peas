import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ServiceContainer, IServiceContainer } from "../../container";

// Mock dependencies
vi.mock("../../register-queues", () => ({
  registerQueues: vi.fn(() => ({
    noteQueue: { close: vi.fn() },
    imageQueue: { close: vi.fn() },
    ingredientQueue: { close: vi.fn() },
    instructionQueue: { close: vi.fn() },
    categorizationQueue: { close: vi.fn() },
    sourceQueue: { close: vi.fn() },
  })),
}));

vi.mock("../../register-database", () => ({
  registerDatabase: vi.fn(() => ({
    prisma: { $disconnect: vi.fn() },
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

describe("ServiceContainer Properties", () => {
  let container: ServiceContainer;

  beforeEach(() => {
    ServiceContainer.reset();
    container = ServiceContainer.getInstance();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("Required Service Properties", () => {
    it("should have all required service properties", () => {
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
      const serviceContainer: IServiceContainer = container;
      expect(serviceContainer).toBeDefined();
      expect(typeof serviceContainer.close).toBe("function");
    });
  });

  describe("Queues Service", () => {
    it("should have queues service with all required queues", () => {
      expect(container.queues).toHaveProperty("noteQueue");
      expect(container.queues).toHaveProperty("imageQueue");
      expect(container.queues).toHaveProperty("ingredientQueue");
      expect(container.queues).toHaveProperty("instructionQueue");
      expect(container.queues).toHaveProperty("categorizationQueue");
      expect(container.queues).toHaveProperty("sourceQueue");
    });

    it("should have close method on each queue", () => {
      expect(typeof container.queues.noteQueue.close).toBe("function");
      expect(typeof container.queues.imageQueue.close).toBe("function");
      expect(typeof container.queues.ingredientQueue.close).toBe("function");
      expect(typeof container.queues.instructionQueue.close).toBe("function");
      expect(typeof container.queues.categorizationQueue.close).toBe(
        "function"
      );
      expect(typeof container.queues.sourceQueue.close).toBe("function");
    });
  });

  describe("Database Service", () => {
    it("should have database service with prisma and createNote", () => {
      expect(container.database).toHaveProperty("prisma");
      expect(container.database).toHaveProperty("createNote");
    });

    it("should have prisma client with disconnect method", () => {
      expect(typeof container.database.prisma.$disconnect).toBe("function");
    });

    it("should have createNote function", () => {
      expect(typeof container.database.createNote).toBe("function");
    });
  });

  describe("Error Handler Service", () => {
    it("should have error handler service", () => {
      expect(container.errorHandler).toHaveProperty("errorHandler");
    });

    it("should have error handler methods", () => {
      expect(typeof container.errorHandler.errorHandler.createJobError).toBe(
        "function"
      );
      expect(typeof container.errorHandler.errorHandler.handleRouteError).toBe(
        "function"
      );
    });
  });

  describe("Health Monitor Service", () => {
    it("should have health monitor service", () => {
      expect(container.healthMonitor).toHaveProperty("healthMonitor");
    });

    it("should have health monitor methods", () => {
      expect(typeof container.healthMonitor.healthMonitor.getHealth).toBe(
        "function"
      );
      expect(typeof container.healthMonitor.healthMonitor.refreshHealth).toBe(
        "function"
      );
      expect(typeof container.healthMonitor.healthMonitor.isHealthy).toBe(
        "function"
      );
    });
  });

  describe("WebSocket Service", () => {
    it("should have web socket service", () => {
      expect(container.webSocket).toHaveProperty("webSocketManager");
    });

    it("should allow setting web socket manager", () => {
      const mockManager = {
        broadcastStatusEvent: vi.fn(),
        getConnectedClientsCount: vi.fn(),
        close: vi.fn(),
      };
      container.webSocket.webSocketManager = mockManager;
      expect(container.webSocket.webSocketManager).toBe(mockManager);
    });
  });

  describe("Status Broadcaster Service", () => {
    it("should have status broadcaster service", () => {
      expect(container.statusBroadcaster).toHaveProperty("statusBroadcaster");
      expect(container.statusBroadcaster).toHaveProperty(
        "addStatusEventAndBroadcast"
      );
    });

    it("should have addStatusEventAndBroadcast function", () => {
      expect(
        typeof container.statusBroadcaster.addStatusEventAndBroadcast
      ).toBe("function");
    });
  });

  describe("Parsers Service", () => {
    it("should have parsers service", () => {
      expect(container.parsers).toHaveProperty("parsers");
      expect(container.parsers).toHaveProperty("parseHTML");
    });

    it("should allow setting parsers", () => {
      const mockParsers = {
        parseHTML: vi.fn(),
      };
      container.parsers.parsers = mockParsers;
      expect(container.parsers.parsers).toBe(mockParsers);
    });
  });

  describe("Logger Service", () => {
    it("should have logger service with all required methods", () => {
      expect(container.logger).toHaveProperty("log");
      expect(container.logger).toHaveProperty("debug");
      expect(container.logger).toHaveProperty("info");
      expect(container.logger).toHaveProperty("warn");
      expect(container.logger).toHaveProperty("error");
      expect(container.logger).toHaveProperty("fatal");
    });

    it("should have additional logger methods", () => {
      expect(container.logger).toHaveProperty("logWithContext");
      expect(container.logger).toHaveProperty("getLogFiles");
      expect(container.logger).toHaveProperty("rotateLogs");
      expect(container.logger).toHaveProperty("getLogStats");
      expect(container.logger).toHaveProperty("clearOldLogs");
    });
  });

  describe("Config Service", () => {
    it("should have config service with all required properties", () => {
      expect(container.config).toHaveProperty("port");
      expect(container.config).toHaveProperty("wsPort");
      expect(container.config).toHaveProperty("wsHost");
      expect(container.config).toHaveProperty("wsUrl");
      expect(container.config).toHaveProperty("redisConnection");
      expect(container.config).toHaveProperty("batchSize");
      expect(container.config).toHaveProperty("maxRetries");
      expect(container.config).toHaveProperty("backoffMs");
      expect(container.config).toHaveProperty("maxBackoffMs");
    });

    it("should have numeric port values", () => {
      expect(typeof container.config.port).toBe("number");
      expect(typeof container.config.wsPort).toBe("number");
    });

    it("should have string host and URL values", () => {
      expect(typeof container.config.wsHost).toBe("string");
      expect(typeof container.config.wsUrl).toBe("string");
    });

    it("should have numeric queue configuration values", () => {
      expect(typeof container.config.batchSize).toBe("number");
      expect(typeof container.config.maxRetries).toBe("number");
      expect(typeof container.config.backoffMs).toBe("number");
      expect(typeof container.config.maxBackoffMs).toBe("number");
    });
  });
});
