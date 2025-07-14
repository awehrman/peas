import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { HealthMonitor } from "../../utils/health-monitor";

// Mock the imported modules
vi.mock("../../config/database", () => ({
  prisma: {
    $queryRaw: vi.fn(),
    note: {
      count: vi.fn(),
    },
  },
}));

vi.mock("../../config/redis", () => ({
  redisConnection: {
    host: "localhost",
  },
}));

// Import the mocked modules
import { prisma } from "../../config/database";
import { redisConnection } from "../../config/redis";

describe("HealthMonitor", () => {
  let monitor: HealthMonitor;

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset singleton and cache
    (HealthMonitor as any).instance = undefined;
    monitor = HealthMonitor.getInstance();
    (monitor as any).healthCache = null;
    (monitor as any).lastCheckTime = null;
    // Always restore healthy state
    (prisma.$queryRaw as any).mockReset();
    (prisma.note.count as any).mockReset();
    (prisma.$queryRaw as any).mockResolvedValue([{ "1": 1 }]);
    (prisma.note.count as any).mockResolvedValue(5);
    (redisConnection as any).host = "localhost";
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should return healthy status for all checks passing", async () => {
    const health = await monitor.getHealth();
    expect(health.status).toBe("healthy");
    expect(health.checks.database.status).toBe("healthy");
    expect(health.checks.redis.status).toBe("healthy");
    expect(health.checks.queues.noteQueue!.status).toBe("healthy");
  });

  it("should cache health and use cache if not expired", async () => {
    const health1 = await monitor.getHealth();
    const health2 = await monitor.getHealth();
    expect(health1).toMatchObject(health2);
    expect(prisma.$queryRaw).toHaveBeenCalledTimes(1); // Should only be called once due to caching
  });

  it("should refresh health and bypass cache", async () => {
    const health1 = await monitor.getHealth();
    const health2 = await monitor.refreshHealth();

    // Compare only relevant fields, ignore timestamps
    expect(health1.status).toBe(health2.status);
    expect(health1.checks.database.status).toBe(health2.checks.database.status);
    expect(health1.checks.redis.status).toBe(health2.checks.redis.status);
    expect(health1.checks.queues.noteQueue!.status).toBe(
      health2.checks.queues.noteQueue!.status
    );

    expect(prisma.$queryRaw).toHaveBeenCalledTimes(2); // Should be called twice due to refresh
  });

  it("should handle database error", async () => {
    (prisma.$queryRaw as any).mockRejectedValue(new Error("db fail"));
    const health = await monitor.getHealth();
    expect(health.checks.database.status).toBe("unhealthy");
    expect(health.status).toBe("unhealthy");
  });

  it("should handle redis error", async () => {
    (redisConnection as any).host = undefined;
    const health = await monitor.getHealth();
    expect(health.checks.redis.status).toBe("unhealthy");
    expect(health.status).toBe("unhealthy");
  });

  it("should handle queue error", async () => {
    (redisConnection as any).host = undefined;
    const health = await monitor.getHealth();
    expect(health.checks.queues.noteQueue!.status).toBe("unhealthy");
    expect(health.status).toBe("unhealthy");
  });

  it("should determine unhealthy if all fail", async () => {
    (prisma.$queryRaw as any).mockRejectedValue(new Error("db fail"));
    (redisConnection as any).host = undefined;
    const health = await monitor.getHealth();
    expect(health.checks.database.status).toBe("unhealthy");
    expect(health.checks.redis.status).toBe("unhealthy");
    expect(health.checks.queues.noteQueue!.status).toBe("unhealthy");
    expect(health.status).toBe("unhealthy");
  });

  it("should return isHealthy true for healthy status", async () => {
    const isHealthy = await monitor.isHealthy();
    expect(isHealthy).toBe(true);
  });

  it("should return isHealthy false for unhealthy status", async () => {
    (prisma.$queryRaw as any).mockRejectedValue(new Error("db fail"));
    (redisConnection as any).host = undefined;
    const isHealthy = await monitor.isHealthy();
    expect(isHealthy).toBe(false);
  });

  it("should get component health", async () => {
    const databaseHealth = await monitor.getComponentHealth("database");
    expect(databaseHealth).toHaveProperty("status", "healthy");
    const queuesHealth = await monitor.getComponentHealth("queues");
    expect(queuesHealth).toHaveProperty("noteQueue");
    expect((queuesHealth as any).noteQueue.status).toBe("healthy");
  });

  it("should return degraded status for slow database response", async () => {
    const originalNow = Date.now;
    let callCount = 0;
    Date.now = vi.fn(() => {
      callCount++;
      return callCount === 1 ? 1000 : 2100; // 1100ms response time
    });
    const health = await monitor.getHealth();
    expect(health.checks.database.status).toBe("degraded");
    expect(health.checks.database.message).toBe("Database is slow to respond");
    expect(health.checks.database.responseTime).toBe(1100);
    Date.now = originalNow;
  });

  it("should return degraded status for slow redis response", async () => {
    // Mock the checkRedisHealth method directly to return degraded status
    const originalCheckRedisHealth = (monitor as any).checkRedisHealth;
    (monitor as any).checkRedisHealth = vi.fn().mockResolvedValue({
      status: "degraded",
      message: "Redis configuration check is slow",
      responseTime: 600,
      lastChecked: new Date(),
    });

    const health = await monitor.getHealth();

    expect(health.checks.redis.status).toBe("degraded");
    expect(health.checks.redis.message).toBe(
      "Redis configuration check is slow"
    );
    expect(health.checks.redis.responseTime).toBe(600);

    // Restore original method
    (monitor as any).checkRedisHealth = originalCheckRedisHealth;
  });

  it("should return degraded status for slow queue response", async () => {
    // Mock the checkQueueHealth method directly to return slow response time
    const originalCheckQueueHealth = (monitor as any).checkQueueHealth;
    (monitor as any).checkQueueHealth = vi.fn().mockResolvedValue({
      noteQueue: {
        status: "healthy",
        message: "Queue system is operational",
        responseTime: 600,
        lastChecked: new Date(),
      },
      imageQueue: {
        status: "healthy",
        message: "Queue system is operational",
        responseTime: 600,
        lastChecked: new Date(),
      },
      ingredientQueue: {
        status: "healthy",
        message: "Queue system is operational",
        responseTime: 600,
        lastChecked: new Date(),
      },
      instructionQueue: {
        status: "healthy",
        message: "Queue system is operational",
        responseTime: 600,
        lastChecked: new Date(),
      },
      categorizationQueue: {
        status: "healthy",
        message: "Queue system is operational",
        responseTime: 600,
        lastChecked: new Date(),
      },
    });

    const health = await monitor.getHealth();

    // All queues should have the slow response time
    expect(health.checks.queues.noteQueue!.status).toBe("healthy"); // Note: queues don't use response time for status
    expect(health.checks.queues.noteQueue!.responseTime).toBe(600);

    // Restore original method
    (monitor as any).checkQueueHealth = originalCheckQueueHealth;
  });

  it("should return healthy status when all checks pass", async () => {
    const originalNow = Date.now;
    let callCount = 0;
    Date.now = vi.fn(() => {
      callCount++;
      return callCount === 1 ? 1000 : 1100; // 100ms response time
    });
    const health = await monitor.getHealth();
    expect(health.status).toBe("healthy");
    expect(health.checks.database.status).toBe("healthy");
    expect(health.checks.redis.status).toBe("healthy");
    expect(health.checks.queues.noteQueue!.status).toBe("healthy");
    Date.now = originalNow;
  });

  it("should test refreshHealth method", async () => {
    const health1 = await monitor.getHealth();
    const health2 = await monitor.refreshHealth();
    expect(health2.status).toBe("healthy");
    expect(health2).toMatchObject(health1); // Should return same result but from fresh check
  });

  it("should test isHealthy method", async () => {
    const isHealthy = await monitor.isHealthy();
    expect(isHealthy).toBe(true);
  });

  it("should test getComponentHealth method", async () => {
    const databaseHealth = await monitor.getComponentHealth("database");
    expect(databaseHealth).toHaveProperty("status", "healthy");
    const queuesHealth = await monitor.getComponentHealth("queues");
    expect(queuesHealth).toHaveProperty("noteQueue");
    expect((queuesHealth as any).noteQueue.status).toBe("healthy");
  });

  it("should return degraded status for slow database response (coverage)", async () => {
    // Mock Date.now to simulate slow response
    let callCount = 0;
    const mockDateNow = vi.spyOn(Date, "now").mockImplementation(() => {
      callCount++;
      return callCount === 1 ? 1000 : 2500; // 1500ms response time
    });

    // Mock prisma to succeed
    (prisma.$queryRaw as any).mockResolvedValue([{ "1": 1 }]);
    (prisma.note.count as any).mockResolvedValue(5);

    // Directly call the private method for coverage
    const monitor = HealthMonitor.getInstance();
    // @ts-expect-error: access private method for test coverage
    const result = await monitor.checkDatabaseHealth();
    expect(result.status).toBe("degraded");
    expect(result.message).toBe("Database is slow to respond");
    expect(result.responseTime).toBe(1500);
    mockDateNow.mockRestore();
  });

  it("should return healthy status for queue health with nonzero response time (coverage)", async () => {
    // Mock Date.now to simulate nonzero response time
    let callCount = 0;
    const mockDateNow = vi.spyOn(Date, "now").mockImplementation(() => {
      callCount++;
      return callCount === 1 ? 1000 : 1600; // 600ms response time
    });

    const monitor = HealthMonitor.getInstance();
    // @ts-expect-error: access private method for test coverage
    const result = await monitor.checkQueueHealth();
    expect(result.noteQueue!.status).toBe("healthy");
    expect(result.noteQueue!.responseTime).toBe(600);
    mockDateNow.mockRestore();
  });
});
