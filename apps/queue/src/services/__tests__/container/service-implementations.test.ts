import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ServiceContainer } from "../../container";

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

describe("Service Implementations", () => {
  let container: ServiceContainer;

  beforeEach(() => {
    ServiceContainer.reset();
    container = ServiceContainer.getInstance();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("WebSocketService", () => {
    it("should have null webSocketManager by default", () => {
      expect(container.webSocket.webSocketManager).toBeNull();
    });

    it("should allow setting webSocketManager", () => {
      const mockManager = {
        broadcastStatusEvent: vi.fn(),
        getConnectedClientsCount: vi.fn(),
        close: vi.fn(),
      };

      container.webSocket.webSocketManager = mockManager;
      expect(container.webSocket.webSocketManager).toBe(mockManager);
    });

    it("should allow setting webSocketManager to null", () => {
      const mockManager = {
        broadcastStatusEvent: vi.fn(),
        getConnectedClientsCount: vi.fn(),
        close: vi.fn(),
      };

      container.webSocket.webSocketManager = mockManager;
      expect(container.webSocket.webSocketManager).toBe(mockManager);

      container.webSocket.webSocketManager = null;
      expect(container.webSocket.webSocketManager).toBeNull();
    });

    it("should maintain webSocketManager reference", () => {
      const mockManager = {
        broadcastStatusEvent: vi.fn(),
        getConnectedClientsCount: vi.fn(),
        close: vi.fn(),
      };

      container.webSocket.webSocketManager = mockManager;
      const retrievedManager = container.webSocket.webSocketManager;

      expect(retrievedManager).toBe(mockManager);
      expect(retrievedManager?.broadcastStatusEvent).toBe(
        mockManager.broadcastStatusEvent
      );
      expect(retrievedManager?.getConnectedClientsCount).toBe(
        mockManager.getConnectedClientsCount
      );
      expect(retrievedManager?.close).toBe(mockManager.close);
    });
  });

  describe("StatusBroadcasterService", () => {
    it("should have null statusBroadcaster by default", () => {
      expect(container.statusBroadcaster.statusBroadcaster).toBeNull();
    });

    it("should allow setting statusBroadcaster", () => {
      const mockBroadcaster = {
        addStatusEventAndBroadcast: vi.fn(),
      };

      container.statusBroadcaster.statusBroadcaster = mockBroadcaster;
      expect(container.statusBroadcaster.statusBroadcaster).toBe(
        mockBroadcaster
      );
    });

    it("should allow setting statusBroadcaster to null", () => {
      const mockBroadcaster = {
        addStatusEventAndBroadcast: vi.fn(),
      };

      container.statusBroadcaster.statusBroadcaster = mockBroadcaster;
      expect(container.statusBroadcaster.statusBroadcaster).toBe(
        mockBroadcaster
      );

      container.statusBroadcaster.statusBroadcaster = null;
      expect(container.statusBroadcaster.statusBroadcaster).toBeNull();
    });

    it("should have addStatusEventAndBroadcast function", () => {
      expect(
        typeof container.statusBroadcaster.addStatusEventAndBroadcast
      ).toBe("function");
    });
  });

  describe("ParserServiceImpl", () => {
    it("should have parsers initialized by default", () => {
      expect(container.parsers.parsers).toBeDefined();
      expect(container.parsers.parseHTML).toBeDefined();
    });

    it("should allow setting parsers", () => {
      const mockParsers = {
        parseHTML: vi.fn(),
      };

      container.parsers.parsers = mockParsers;
      expect(container.parsers.parsers).toBe(mockParsers);
    });

    it("should allow setting parsers to null", () => {
      const mockParsers = {
        parseHTML: vi.fn(),
      };

      container.parsers.parsers = mockParsers;
      expect(container.parsers.parsers).toBe(mockParsers);

      container.parsers.parsers = null;
      expect(container.parsers.parsers).toBeNull();
    });

    it("should return undefined parseHTML when parsers is null", () => {
      container.parsers.parsers = null;
      expect(container.parsers.parseHTML).toBeUndefined();
    });

    it("should return parseHTML function when parsers is set", () => {
      const mockParseHTML = vi.fn();
      const mockParsers = {
        parseHTML: mockParseHTML,
      };

      container.parsers.parsers = mockParsers;
      expect(container.parsers.parseHTML).toBe(mockParseHTML);
    });

    it("should maintain parsers reference", () => {
      const mockParseHTML = vi.fn();
      const mockParsers = {
        parseHTML: mockParseHTML,
      };

      container.parsers.parsers = mockParsers;
      const retrievedParsers = container.parsers.parsers;

      expect(retrievedParsers).toBe(mockParsers);
      expect(retrievedParsers?.parseHTML).toBe(mockParseHTML);
    });
  });

  describe("ErrorHandlerService", () => {
    it("should return ErrorHandler", () => {
      expect(container.errorHandler.errorHandler).toBeDefined();
      expect(typeof container.errorHandler.errorHandler.createJobError).toBe(
        "function"
      );
      expect(typeof container.errorHandler.errorHandler.handleRouteError).toBe(
        "function"
      );
    });
  });

  describe("HealthMonitorService", () => {
    it("should return HealthMonitor instance", () => {
      expect(container.healthMonitor.healthMonitor).toBeDefined();
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

  describe("Parser Initialization", () => {
    it("should initialize parsers with parseHTML function in constructor", () => {
      expect(container.parsers.parsers).toBeDefined();
      expect(container.parsers.parseHTML).toBeDefined();
      expect(typeof container.parsers.parseHTML).toBe("function");
    });

    it("should handle parseHTML function call", async () => {
      const mockParseHTML = vi.fn().mockResolvedValue("parsed content");
      container.parsers.parsers = {
        parseHTML: mockParseHTML,
      };

      const content = "<html><body>Test</body></html>";
      const result = await container.parsers.parseHTML!(content);

      expect(mockParseHTML).toHaveBeenCalledWith(content);
      expect(result).toBe("parsed content");
    });

    it("should handle parseHTML function errors", async () => {
      const mockError = new Error("Parse failed");
      const mockParseHTML = vi.fn().mockRejectedValue(mockError);
      container.parsers.parsers = {
        parseHTML: mockParseHTML,
      };

      const content = "<html><body>Test</body></html>";
      await expect(container.parsers.parseHTML!(content)).rejects.toThrow(
        "Parse failed"
      );
    });
  });

  describe("Service Integration", () => {
    it("should maintain service references across container lifecycle", () => {
      const originalWebSocket = container.webSocket;
      const originalStatusBroadcaster = container.statusBroadcaster;
      const originalParsers = container.parsers;

      ServiceContainer.reset();
      const newContainer = ServiceContainer.getInstance();

      expect(newContainer.webSocket).not.toBe(originalWebSocket);
      expect(newContainer.statusBroadcaster).not.toBe(
        originalStatusBroadcaster
      );
      expect(newContainer.parsers).not.toBe(originalParsers);
    });

    it("should allow independent service configuration", () => {
      const mockWebSocketManager = {
        broadcastStatusEvent: vi.fn(),
        getConnectedClientsCount: vi.fn(),
        close: vi.fn(),
      };

      const mockStatusBroadcaster = {
        addStatusEventAndBroadcast: vi.fn(),
      };

      const mockParsers = {
        parseHTML: vi.fn(),
      };

      container.webSocket.webSocketManager = mockWebSocketManager;
      container.statusBroadcaster.statusBroadcaster = mockStatusBroadcaster;
      container.parsers.parsers = mockParsers;

      expect(container.webSocket.webSocketManager).toBe(mockWebSocketManager);
      expect(container.statusBroadcaster.statusBroadcaster).toBe(
        mockStatusBroadcaster
      );
      expect(container.parsers.parsers).toBe(mockParsers);
    });
  });
});
