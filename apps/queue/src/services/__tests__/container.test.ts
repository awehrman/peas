import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  ServiceContainer,
  createServiceContainer,
  serviceContainer,
  IServiceContainer,
  IConfigService,
  IErrorHandlerService,
  IHealthMonitorService,
  IWebSocketService,
  IStatusBroadcasterService,
  IParserService,
} from "../container";
import type { IQueueService, IDatabaseService } from "../index";

// Mock dependencies
vi.mock("../register-queues", () => ({
  registerQueues: vi.fn(() => ({
    noteQueue: { close: vi.fn() },
    imageQueue: { close: vi.fn() },
    ingredientQueue: { close: vi.fn() },
    instructionQueue: { close: vi.fn() },
    categorizationQueue: { close: vi.fn() },
    sourceQueue: { close: vi.fn() },
  })),
}));

vi.mock("../register-database", () => ({
  registerDatabase: vi.fn(() => ({
    prisma: { $disconnect: vi.fn() },
    createNote: vi.fn(),
  })),
}));

vi.mock("../register-logger", () => ({
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

vi.mock("../utils/error-handler", () => ({
  ErrorHandler: {
    handle: vi.fn(),
    log: vi.fn(),
  },
}));

vi.mock("../utils/health-monitor", () => ({
  HealthMonitor: {
    getInstance: vi.fn(() => ({
      start: vi.fn(),
      stop: vi.fn(),
      getStatus: vi.fn(),
    })),
  },
}));

vi.mock("../parsers/html.js", () => ({
  parseHTML: vi.fn(),
}));

vi.mock("../utils/status-broadcaster.js", () => ({
  addStatusEventAndBroadcast: vi.fn(),
}));

describe("ServiceContainer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset the singleton instance before each test
    ServiceContainer.reset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("Singleton Pattern", () => {
    it("should return the same instance when getInstance is called multiple times", () => {
      const instance1 = ServiceContainer.getInstance();
      const instance2 = ServiceContainer.getInstance();
      expect(instance1).toBe(instance2);
    });

    it("should create a new instance when reset is called", () => {
      const instance1 = ServiceContainer.getInstance();
      ServiceContainer.reset();
      const instance2 = ServiceContainer.getInstance();
      expect(instance1).not.toBe(instance2);
    });
  });

  describe("Service Properties", () => {
    let container: ServiceContainer;

    beforeEach(() => {
      container = ServiceContainer.getInstance();
    });

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

    it("should have queues service with all required queues", () => {
      expect(container.queues).toHaveProperty("noteQueue");
      expect(container.queues).toHaveProperty("imageQueue");
      expect(container.queues).toHaveProperty("ingredientQueue");
      expect(container.queues).toHaveProperty("instructionQueue");
      expect(container.queues).toHaveProperty("categorizationQueue");
      expect(container.queues).toHaveProperty("sourceQueue");
    });

    it("should have database service with prisma and createNote", () => {
      expect(container.database).toHaveProperty("prisma");
      expect(container.database).toHaveProperty("createNote");
    });

    it("should have error handler service", () => {
      expect(container.errorHandler).toHaveProperty("errorHandler");
    });

    it("should have health monitor service", () => {
      expect(container.healthMonitor).toHaveProperty("healthMonitor");
    });

    it("should have web socket service", () => {
      expect(container.webSocket).toHaveProperty("webSocketManager");
    });

    it("should have status broadcaster service", () => {
      expect(container.statusBroadcaster).toHaveProperty("statusBroadcaster");
      expect(container.statusBroadcaster).toHaveProperty(
        "addStatusEventAndBroadcast"
      );
    });

    it("should have parsers service", () => {
      expect(container.parsers).toHaveProperty("parsers");
      expect(container.parsers).toHaveProperty("parseHTML");
    });

    it("should have logger service", () => {
      expect(container.logger).toHaveProperty("log");
      expect(container.logger).toHaveProperty("debug");
      expect(container.logger).toHaveProperty("info");
      expect(container.logger).toHaveProperty("warn");
      expect(container.logger).toHaveProperty("error");
      expect(container.logger).toHaveProperty("fatal");
    });

    it("should have config service with all required properties", () => {
      expect(container.config).toHaveProperty("port");
      expect(container.config).toHaveProperty("wsPort");
      expect(container.config).toHaveProperty("redisConnection");
      expect(container.config).toHaveProperty("batchSize");
      expect(container.config).toHaveProperty("maxRetries");
      expect(container.config).toHaveProperty("backoffMs");
      expect(container.config).toHaveProperty("maxBackoffMs");
    });
  });

  describe("close method", () => {
    it("should close all queues and resources successfully", async () => {
      const container = ServiceContainer.getInstance();
      const mockLogger = vi.mocked(container.logger.log);

      await container.close();

      // Verify all queues were closed
      expect(container.queues.noteQueue.close).toHaveBeenCalled();
      expect(container.queues.imageQueue.close).toHaveBeenCalled();
      expect(container.queues.ingredientQueue.close).toHaveBeenCalled();
      expect(container.queues.instructionQueue.close).toHaveBeenCalled();
      expect(container.queues.categorizationQueue.close).toHaveBeenCalled();

      // Verify database was disconnected
      expect(container.database.prisma.$disconnect).toHaveBeenCalled();

      // Verify success message was logged
      expect(mockLogger).toHaveBeenCalledWith(
        "ServiceContainer closed successfully"
      );
    });

    it("should handle errors during close and log them", async () => {
      const container = ServiceContainer.getInstance();
      const mockError = new Error("Close failed");
      const mockLogger = vi.mocked(container.logger.log);

      // Mock a failure in one of the close operations
      vi.mocked(container.queues.noteQueue.close).mockRejectedValue(mockError);

      // Promise.allSettled doesn't throw, so the close method should complete successfully
      await container.close();

      // Verify success message was logged (Promise.allSettled handles the error internally)
      expect(mockLogger).toHaveBeenCalledWith(
        "ServiceContainer closed successfully"
      );
    });

    it("should close web socket manager if it exists", async () => {
      const container = ServiceContainer.getInstance();
      const mockWebSocketManager = {
        close: vi.fn(),
        broadcastStatusEvent: vi.fn(),
        getConnectedClientsCount: vi.fn(),
      };

      container.webSocket.webSocketManager = mockWebSocketManager;

      await container.close();

      expect(mockWebSocketManager.close).toHaveBeenCalled();
    });

    it("should handle errors during close and throw them", async () => {
      const container = ServiceContainer.getInstance();
      const mockError = new Error("Database disconnect failed");
      const mockLogger = vi.mocked(container.logger.log);

      // Mock a failure in database disconnect
      vi.mocked(container.database.prisma.$disconnect).mockRejectedValue(
        mockError
      );

      await expect(container.close()).rejects.toThrow(
        "Database disconnect failed"
      );

      // Verify error was logged
      expect(mockLogger).toHaveBeenCalledWith(
        "Error closing ServiceContainer: Error: Database disconnect failed",
        "error"
      );
    });
  });
});

describe("ConfigService", () => {
  let container: ServiceContainer;

  beforeEach(() => {
    container = ServiceContainer.getInstance();
  });

  it("should return default port when PORT env var is not set", () => {
    delete process.env.PORT;
    expect(container.config.port).toBe(4200); // Actual SERVER_DEFAULTS.PORT
  });

  it("should return environment PORT when set", () => {
    process.env.PORT = "8080";
    expect(container.config.port).toBe(8080);
  });

  it("should return default wsPort when WS_PORT env var is not set", () => {
    delete process.env.WS_PORT;
    expect(container.config.wsPort).toBe(8080); // Actual SERVER_DEFAULTS.WS_PORT
  });

  it("should return environment WS_PORT when set", () => {
    process.env.WS_PORT = "8081";
    expect(container.config.wsPort).toBe(8081);
  });

  it("should return redis connection", () => {
    expect(container.config.redisConnection).toBeDefined();
  });

  it("should return default batch size when BATCH_SIZE env var is not set", () => {
    delete process.env.BATCH_SIZE;
    expect(container.config.batchSize).toBe(10); // Actual QUEUE_DEFAULTS.BATCH_SIZE
  });

  it("should return environment BATCH_SIZE when set", () => {
    process.env.BATCH_SIZE = "20";
    expect(container.config.batchSize).toBe(20);
  });

  it("should return default max retries when MAX_RETRIES env var is not set", () => {
    delete process.env.MAX_RETRIES;
    expect(container.config.maxRetries).toBe(3); // Actual QUEUE_DEFAULTS.MAX_RETRIES
  });

  it("should return environment MAX_RETRIES when set", () => {
    process.env.MAX_RETRIES = "5";
    expect(container.config.maxRetries).toBe(5);
  });

  it("should return default backoff ms when BACKOFF_MS env var is not set", () => {
    delete process.env.BACKOFF_MS;
    expect(container.config.backoffMs).toBe(1000); // Actual QUEUE_DEFAULTS.BACKOFF_MS
  });

  it("should return environment BACKOFF_MS when set", () => {
    process.env.BACKOFF_MS = "2000";
    expect(container.config.backoffMs).toBe(2000);
  });

  it("should return default max backoff ms when MAX_BACKOFF_MS env var is not set", () => {
    delete process.env.MAX_BACKOFF_MS;
    expect(container.config.maxBackoffMs).toBe(30000); // Actual QUEUE_DEFAULTS.MAX_BACKOFF_MS
  });

  it("should return environment MAX_BACKOFF_MS when set", () => {
    process.env.MAX_BACKOFF_MS = "60000";
    expect(container.config.maxBackoffMs).toBe(60000);
  });

  it("should implement IConfigService interface", () => {
    const config: IConfigService = container.config;
    expect(config).toBeDefined();
    expect(typeof config.port).toBe("number");
    expect(typeof config.wsPort).toBe("number");
    expect(typeof config.batchSize).toBe("number");
    expect(typeof config.maxRetries).toBe("number");
    expect(typeof config.backoffMs).toBe("number");
    expect(typeof config.maxBackoffMs).toBe("number");
  });
});

describe("Individual Service Implementations", () => {
  let container: ServiceContainer;

  beforeEach(() => {
    container = ServiceContainer.getInstance();
  });

  describe("ErrorHandlerService", () => {
    it("should implement IErrorHandlerService interface", () => {
      const errorHandler: IErrorHandlerService = container.errorHandler;
      expect(errorHandler).toHaveProperty("errorHandler");
    });

    it("should return ErrorHandler class", () => {
      expect(container.errorHandler.errorHandler).toBeDefined();
    });
  });

  describe("HealthMonitorService", () => {
    it("should implement IHealthMonitorService interface", () => {
      const healthMonitor: IHealthMonitorService = container.healthMonitor;
      expect(healthMonitor).toHaveProperty("healthMonitor");
    });

    it("should return HealthMonitor instance", () => {
      expect(container.healthMonitor.healthMonitor).toBeDefined();
    });
  });

  describe("WebSocketService", () => {
    it("should implement IWebSocketService interface", () => {
      const webSocket: IWebSocketService = container.webSocket;
      expect(webSocket).toHaveProperty("webSocketManager");
    });

    it("should allow setting and getting web socket manager", () => {
      const mockManager = {
        close: vi.fn(),
        broadcastStatusEvent: vi.fn(),
        getConnectedClientsCount: vi.fn(),
      };

      container.webSocket.webSocketManager = mockManager;
      expect(container.webSocket.webSocketManager).toBe(mockManager);
    });

    it("should return null when no web socket manager is set", () => {
      container.webSocket.webSocketManager = null;
      expect(container.webSocket.webSocketManager).toBeNull();
    });
  });

  describe("StatusBroadcasterService", () => {
    it("should implement IStatusBroadcasterService interface", () => {
      const statusBroadcaster: IStatusBroadcasterService =
        container.statusBroadcaster;
      expect(statusBroadcaster).toHaveProperty("statusBroadcaster");
      expect(statusBroadcaster).toHaveProperty("addStatusEventAndBroadcast");
    });

    it("should allow setting and getting status broadcaster", () => {
      const mockBroadcaster = {
        addStatusEventAndBroadcast: vi.fn(),
      };

      container.statusBroadcaster.statusBroadcaster = mockBroadcaster;
      expect(container.statusBroadcaster.statusBroadcaster).toBe(
        mockBroadcaster
      );
    });

    it("should have addStatusEventAndBroadcast function", () => {
      expect(
        typeof container.statusBroadcaster.addStatusEventAndBroadcast
      ).toBe("function");
    });
  });

  describe("ParserServiceImpl", () => {
    it("should implement IParserService interface", () => {
      const parsers: IParserService = container.parsers;
      expect(parsers).toHaveProperty("parsers");
      expect(parsers).toHaveProperty("parseHTML");
    });

    it("should allow setting and getting parsers", () => {
      const mockParsers = {
        parseHTML: vi.fn(),
      };

      container.parsers.parsers = mockParsers;
      expect(container.parsers.parsers).toBe(mockParsers);
    });

    it("should return parseHTML function when parsers are set", () => {
      const mockParsers = {
        parseHTML: vi.fn(),
      };

      container.parsers.parsers = mockParsers;
      expect(container.parsers.parseHTML).toBe(mockParsers.parseHTML);
    });

    it("should return undefined parseHTML when parsers are null", () => {
      container.parsers.parsers = null;
      expect(container.parsers.parseHTML).toBeUndefined();
    });
  });
});

describe("createServiceContainer", () => {
  beforeEach(() => {
    ServiceContainer.reset();
  });

  it("should return the singleton instance when no overrides are provided", () => {
    const container = createServiceContainer();
    const singleton = ServiceContainer.getInstance();
    expect(container).toBe(singleton);
  });

  it("should return a new object with overrides when provided", () => {
    const mockQueues: Partial<IQueueService> = {
      noteQueue: { close: vi.fn() } as any,
      imageQueue: { close: vi.fn() } as any,
      ingredientQueue: { close: vi.fn() } as any,
      instructionQueue: { close: vi.fn() } as any,
      categorizationQueue: { close: vi.fn() } as any,
      sourceQueue: { close: vi.fn() } as any,
    };

    const container = createServiceContainer({
      queues: mockQueues as IQueueService,
    });
    expect(container.queues).toBe(mockQueues);
    expect(container).toHaveProperty("close");
  });

  it("should call overridden close methods when provided", async () => {
    const mockQueues: Partial<IQueueService> = {
      noteQueue: { close: vi.fn() } as any,
      imageQueue: { close: vi.fn() } as any,
      ingredientQueue: { close: vi.fn() } as any,
      instructionQueue: { close: vi.fn() } as any,
      categorizationQueue: { close: vi.fn() } as any,
      sourceQueue: { close: vi.fn() } as any,
    };

    const mockDatabase: Partial<IDatabaseService> = {
      prisma: { $disconnect: vi.fn() } as any,
      createNote: vi.fn(),
    };

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

    const container = createServiceContainer({
      queues: mockQueues as IQueueService,
      database: mockDatabase as IDatabaseService,
      logger: mockLogger,
    });

    await container.close();

    expect(mockQueues.noteQueue?.close).toHaveBeenCalled();
    expect(mockQueues.imageQueue?.close).toHaveBeenCalled();
    expect(mockQueues.ingredientQueue?.close).toHaveBeenCalled();
    expect(mockQueues.instructionQueue?.close).toHaveBeenCalled();
    expect(mockQueues.categorizationQueue?.close).toHaveBeenCalled();
    expect(mockDatabase.prisma?.$disconnect).toHaveBeenCalled();
    expect(mockLogger.log).toHaveBeenCalledWith(
      "ServiceContainer closed successfully"
    );
  });

  it("should handle web socket manager close when provided in overrides", async () => {
    const mockWebSocketManager = {
      close: vi.fn(),
      broadcastStatusEvent: vi.fn(),
      getConnectedClientsCount: vi.fn(),
    };

    const mockWebSocket: Partial<IWebSocketService> = {
      webSocketManager: mockWebSocketManager,
    };

    const container = createServiceContainer({
      webSocket: mockWebSocket as IWebSocketService,
    });

    await container.close();

    expect(mockWebSocketManager.close).toHaveBeenCalled();
  });

  it("should handle partial overrides without all services", async () => {
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

    const container = createServiceContainer({
      logger: mockLogger,
    });

    await container.close();

    // Should only call the overridden logger's log method
    expect(mockLogger.log).toHaveBeenCalledWith(
      "ServiceContainer closed successfully"
    );
  });

  it("should implement IServiceContainer interface", () => {
    const container = createServiceContainer();
    const serviceContainer: IServiceContainer = container;
    expect(serviceContainer).toBeDefined();
    expect(typeof serviceContainer.close).toBe("function");
  });
});

describe("serviceContainer export", () => {
  it("should export a ServiceContainer instance", () => {
    expect(serviceContainer).toBeInstanceOf(ServiceContainer);
  });

  it("should implement IServiceContainer interface", () => {
    const container: IServiceContainer = serviceContainer;
    expect(container).toBeDefined();
    expect(typeof container.close).toBe("function");
  });
});
