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

describe("ConfigService", () => {
  let container: ServiceContainer;
  let originalEnv: Record<string, string | undefined>;

  beforeEach(() => {
    ServiceContainer.reset();
    container = ServiceContainer.getInstance();
    originalEnv = { ...process.env };
    vi.clearAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.clearAllMocks();
  });

  describe("Port Configuration", () => {
    it("should use environment PORT when set", () => {
      process.env.PORT = "8080";
      ServiceContainer.reset();
      const newContainer = ServiceContainer.getInstance();

      expect(newContainer.config.port).toBe(8080);
    });

    it("should fall back to default PORT when not set", () => {
      delete process.env.PORT;
      ServiceContainer.reset();
      const newContainer = ServiceContainer.getInstance();

      expect(newContainer.config.port).toBe(4200); // Default is 4200
    });

    it("should handle invalid PORT gracefully", () => {
      process.env.PORT = "invalid";
      ServiceContainer.reset();
      const newContainer = ServiceContainer.getInstance();

      expect(newContainer.config.port).toBeNaN();
    });
  });

  describe("WebSocket Port Configuration", () => {
    it("should use environment WS_PORT when set", () => {
      process.env.WS_PORT = "8081";
      ServiceContainer.reset();
      const newContainer = ServiceContainer.getInstance();

      expect(newContainer.config.wsPort).toBe(8081);
    });

    it("should fall back to default WS_PORT when not set", () => {
      delete process.env.WS_PORT;
      ServiceContainer.reset();
      const newContainer = ServiceContainer.getInstance();

      expect(newContainer.config.wsPort).toBe(8080); // Default is 8080
    });

    it("should handle invalid WS_PORT gracefully", () => {
      process.env.WS_PORT = "invalid";
      ServiceContainer.reset();
      const newContainer = ServiceContainer.getInstance();

      expect(newContainer.config.wsPort).toBeNaN();
    });
  });

  describe("WebSocket Host Configuration", () => {
    it("should use environment WS_HOST when set", () => {
      process.env.WS_HOST = "custom-host";
      ServiceContainer.reset();
      const newContainer = ServiceContainer.getInstance();

      expect(newContainer.config.wsHost).toBe("custom-host");
    });

    it("should fall back to default WS_HOST when not set", () => {
      delete process.env.WS_HOST;
      ServiceContainer.reset();
      const newContainer = ServiceContainer.getInstance();

      expect(newContainer.config.wsHost).toBe("localhost");
    });
  });

  describe("WebSocket URL Configuration", () => {
    it("should use WS_URL override when set", () => {
      process.env.WS_URL = "wss://custom-url.com";
      ServiceContainer.reset();
      const newContainer = ServiceContainer.getInstance();

      expect(newContainer.config.wsUrl).toBe("wss://custom-url.com");
    });

    it("should construct URL with ws protocol in development", () => {
      delete process.env.WS_URL;
      process.env.NODE_ENV = "development";
      process.env.WS_HOST = "localhost";
      process.env.WS_PORT = "3001";

      ServiceContainer.reset();
      const newContainer = ServiceContainer.getInstance();

      expect(newContainer.config.wsUrl).toBe("ws://localhost:3001");
    });

    it("should construct URL with wss protocol in production", () => {
      delete process.env.WS_URL;
      process.env.NODE_ENV = "production";
      process.env.WS_HOST = "example.com";
      process.env.WS_PORT = "443";

      ServiceContainer.reset();
      const newContainer = ServiceContainer.getInstance();

      expect(newContainer.config.wsUrl).toBe("wss://example.com:443");
    });

    it("should construct URL with ws protocol when NODE_ENV is not production", () => {
      delete process.env.WS_URL;
      delete process.env.NODE_ENV;
      process.env.WS_HOST = "localhost";
      process.env.WS_PORT = "3001";

      ServiceContainer.reset();
      const newContainer = ServiceContainer.getInstance();

      expect(newContainer.config.wsUrl).toBe("ws://localhost:3001");
    });
  });

  describe("Queue Configuration", () => {
    it("should use environment BATCH_SIZE when set", () => {
      process.env.BATCH_SIZE = "50";
      ServiceContainer.reset();
      const newContainer = ServiceContainer.getInstance();

      expect(newContainer.config.batchSize).toBe(50);
    });

    it("should fall back to default BATCH_SIZE when not set", () => {
      delete process.env.BATCH_SIZE;
      ServiceContainer.reset();
      const newContainer = ServiceContainer.getInstance();

      expect(newContainer.config.batchSize).toBe(10); // Assuming default is 10
    });

    it("should handle invalid BATCH_SIZE gracefully", () => {
      process.env.BATCH_SIZE = "invalid";
      ServiceContainer.reset();
      const newContainer = ServiceContainer.getInstance();

      expect(newContainer.config.batchSize).toBeNaN();
    });

    it("should use environment MAX_RETRIES when set", () => {
      process.env.MAX_RETRIES = "5";
      ServiceContainer.reset();
      const newContainer = ServiceContainer.getInstance();

      expect(newContainer.config.maxRetries).toBe(5);
    });

    it("should fall back to default MAX_RETRIES when not set", () => {
      delete process.env.MAX_RETRIES;
      ServiceContainer.reset();
      const newContainer = ServiceContainer.getInstance();

      expect(newContainer.config.maxRetries).toBe(3); // Assuming default is 3
    });

    it("should handle invalid MAX_RETRIES gracefully", () => {
      process.env.MAX_RETRIES = "invalid";
      ServiceContainer.reset();
      const newContainer = ServiceContainer.getInstance();

      expect(newContainer.config.maxRetries).toBeNaN();
    });

    it("should use environment BACKOFF_MS when set", () => {
      process.env.BACKOFF_MS = "1000";
      ServiceContainer.reset();
      const newContainer = ServiceContainer.getInstance();

      expect(newContainer.config.backoffMs).toBe(1000);
    });

    it("should fall back to default BACKOFF_MS when not set", () => {
      delete process.env.BACKOFF_MS;
      ServiceContainer.reset();
      const newContainer = ServiceContainer.getInstance();

      expect(newContainer.config.backoffMs).toBe(1000); // Assuming default is 1000
    });

    it("should handle invalid BACKOFF_MS gracefully", () => {
      process.env.BACKOFF_MS = "invalid";
      ServiceContainer.reset();
      const newContainer = ServiceContainer.getInstance();

      expect(newContainer.config.backoffMs).toBeNaN();
    });

    it("should use environment MAX_BACKOFF_MS when set", () => {
      process.env.MAX_BACKOFF_MS = "30000";
      ServiceContainer.reset();
      const newContainer = ServiceContainer.getInstance();

      expect(newContainer.config.maxBackoffMs).toBe(30000);
    });

    it("should fall back to default MAX_BACKOFF_MS when not set", () => {
      delete process.env.MAX_BACKOFF_MS;
      ServiceContainer.reset();
      const newContainer = ServiceContainer.getInstance();

      expect(newContainer.config.maxBackoffMs).toBe(30000); // Assuming default is 30000
    });

    it("should handle invalid MAX_BACKOFF_MS gracefully", () => {
      process.env.MAX_BACKOFF_MS = "invalid";
      ServiceContainer.reset();
      const newContainer = ServiceContainer.getInstance();

      expect(newContainer.config.maxBackoffMs).toBeNaN();
    });
  });

  describe("Redis Connection", () => {
    it("should return redis connection", () => {
      expect(container.config.redisConnection).toBeDefined();
      expect(typeof container.config.redisConnection).toBe("object");
    });
  });

  describe("Configuration Type Safety", () => {
    it("should have all required configuration properties", () => {
      expect(typeof container.config.port).toBe("number");
      expect(typeof container.config.wsPort).toBe("number");
      expect(typeof container.config.wsHost).toBe("string");
      expect(typeof container.config.wsUrl).toBe("string");
      expect(typeof container.config.batchSize).toBe("number");
      expect(typeof container.config.maxRetries).toBe("number");
      expect(typeof container.config.backoffMs).toBe("number");
      expect(typeof container.config.maxBackoffMs).toBe("number");
    });
  });
});
