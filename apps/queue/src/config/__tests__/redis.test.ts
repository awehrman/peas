import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock redis module
const mockCreateClient = vi.fn();
const mockRedisClient = {
  on: vi.fn(),
  connect: vi.fn().mockResolvedValue(undefined),
};

vi.mock("redis", () => ({
  createClient: mockCreateClient,
}));

describe("redis.ts", () => {
  let originalEnv: Record<string, string | undefined>;
  let logSpy: ReturnType<typeof vi.spyOn>;
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    originalEnv = { ...process.env };
    logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockCreateClient.mockReturnValue(mockRedisClient);
    vi.clearAllMocks();
    vi.resetModules();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    logSpy.mockRestore();
    errorSpy.mockRestore();
    vi.clearAllMocks();
  });

  describe("Configuration", () => {
    it("should create redisConfig with environment variables", async () => {
      process.env.REDISHOST = "test-host";
      process.env.REDISPORT = "6380";
      process.env.REDISUSER = "test-user";
      process.env.REDISPASSWORD = "test-pass";

      const { redisConfig } = await import("../redis");

      expect(redisConfig).toEqual({
        host: "test-host",
        port: 6380,
        username: "test-user",
        password: "test-pass",
      });
    });

    it("should use default port when REDISPORT is not set", async () => {
      delete process.env.REDISPORT;
      process.env.REDISHOST = "test-host";

      const { redisConfig } = await import("../redis");

      expect(redisConfig.port).toBe(6379); // Default from REDIS_DEFAULTS.PORT
    });

    it("should handle undefined environment variables", async () => {
      delete process.env.REDISHOST;
      delete process.env.REDISPORT;
      delete process.env.REDISUSER;
      delete process.env.REDISPASSWORD;

      const { redisConfig } = await import("../redis");

      expect(redisConfig).toEqual({
        host: undefined,
        port: 6379,
        username: undefined,
        password: undefined,
      });
    });

    it("should parse REDISPORT as integer", async () => {
      process.env.REDISPORT = "12345";
      process.env.REDISHOST = "test-host";

      const { redisConfig } = await import("../redis");

      expect(redisConfig.port).toBe(12345);
      expect(typeof redisConfig.port).toBe("number");
    });
  });

  describe("Redis Client Creation", () => {
    it("should create Redis client with correct configuration", async () => {
      process.env.REDISHOST = "test-host";
      process.env.REDISPORT = "6380";
      process.env.REDISUSER = "test-user";
      process.env.REDISPASSWORD = "test-pass";

      await import("../redis");

      expect(mockCreateClient).toHaveBeenCalledWith({
        socket: {
          host: "test-host",
          port: 6380,
        },
        username: "test-user",
        password: "test-pass",
      });
    });

    it("should create Redis client with undefined values when env vars not set", async () => {
      delete process.env.REDISHOST;
      delete process.env.REDISPORT;
      delete process.env.REDISUSER;
      delete process.env.REDISPASSWORD;

      await import("../redis");

      expect(mockCreateClient).toHaveBeenCalledWith({
        socket: {
          host: undefined,
          port: 6379,
        },
        username: undefined,
        password: undefined,
      });
    });
  });

  describe("Event Handlers", () => {
    it("should register connect event handler", async () => {
      await import("../redis");

      expect(mockRedisClient.on).toHaveBeenCalledWith(
        "connect",
        expect.any(Function)
      );
    });

    it("should register error event handler", async () => {
      await import("../redis");

      expect(mockRedisClient.on).toHaveBeenCalledWith(
        "error",
        expect.any(Function)
      );
    });

    it("should register end event handler", async () => {
      await import("../redis");

      expect(mockRedisClient.on).toHaveBeenCalledWith(
        "end",
        expect.any(Function)
      );
    });

    it("should log success message on connect", async () => {
      await import("../redis");

      // Find the connect handler
      const connectCall = mockRedisClient.on.mock.calls.find(
        ([event]) => event === "connect"
      );
      expect(connectCall).toBeDefined();
      const connectHandler = connectCall![1];

      // Call the handler
      connectHandler();

      expect(logSpy).toHaveBeenCalledWith("✅ Redis client connected");
    });

    it("should log error message on error event", async () => {
      await import("../redis");

      // Find the error handler
      const errorCall = mockRedisClient.on.mock.calls.find(
        ([event]) => event === "error"
      );
      expect(errorCall).toBeDefined();
      const errorHandler = errorCall![1];

      const testError = new Error("Redis connection failed");
      errorHandler(testError);

      expect(errorSpy).toHaveBeenCalledWith(
        "❌ Redis client error:",
        testError
      );
    });

    it("should log disconnect message on end event", async () => {
      await import("../redis");

      // Find the end handler
      const endCall = mockRedisClient.on.mock.calls.find(
        ([event]) => event === "end"
      );
      expect(endCall).toBeDefined();
      const endHandler = endCall![1];

      // Call the handler
      endHandler();

      expect(logSpy).toHaveBeenCalledWith("🛑 Redis client disconnected");
    });
  });

  describe("Connection", () => {
    it("should attempt to connect to Redis", async () => {
      await import("../redis");

      expect(mockRedisClient.connect).toHaveBeenCalled();
    });

    it("should handle connection success", async () => {
      mockRedisClient.connect.mockResolvedValue(undefined);

      await import("../redis");

      expect(mockRedisClient.connect).toHaveBeenCalled();
    });

    it("should handle connection failure", async () => {
      const connectionError = new Error("Connection refused");
      mockRedisClient.connect.mockRejectedValue(connectionError);

      await import("../redis");

      expect(mockRedisClient.connect).toHaveBeenCalled();
      expect(errorSpy).toHaveBeenCalledWith(
        "❌ Failed to connect to Redis:",
        connectionError
      );
    });

    it("should handle connection error with custom error message", async () => {
      const customError = new Error("Network timeout");
      mockRedisClient.connect.mockRejectedValue(customError);

      await import("../redis");

      expect(errorSpy).toHaveBeenCalledWith(
        "❌ Failed to connect to Redis:",
        customError
      );
    });
  });

  describe("Integration", () => {
    it("should export redisConfig and redisConnection", async () => {
      const { redisConfig, redisConnection } = await import("../redis");

      expect(redisConfig).toBeDefined();
      expect(redisConnection).toBeDefined();
      expect(redisConnection).toBe(mockRedisClient);
    });

    it("should handle all event types in sequence", async () => {
      await import("../redis");

      // Verify all event handlers are registered
      const eventCalls = mockRedisClient.on.mock.calls;
      const events = eventCalls.map(([event]) => event);

      expect(events).toContain("connect");
      expect(events).toContain("error");
      expect(events).toContain("end");
      expect(events).toHaveLength(3);
    });

    it("should handle malformed REDISPORT gracefully", async () => {
      process.env.REDISPORT = "invalid-port";
      process.env.REDISHOST = "test-host";

      const { redisConfig } = await import("../redis");

      expect(redisConfig.port).toBeNaN();
    });
  });
});
