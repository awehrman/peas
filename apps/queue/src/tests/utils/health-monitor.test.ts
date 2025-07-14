import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { HealthMonitor } from "../../utils/health-monitor";
import { prisma } from "../../config/database";
import { redisConnection } from "../../config/redis";
import type { HealthCheck } from "../../types";

type MockQueue = { count: ReturnType<typeof vi.fn> };

// Save originals for restoration
const originalPrisma = { ...prisma };
const originalRedis = { ...redisConnection };

describe("HealthMonitor", () => {
  let monitor: HealthMonitor;

  beforeEach(() => {
    // Reset singleton and cache
    (HealthMonitor as unknown as { instance: undefined }).instance = undefined;
    monitor = HealthMonitor.getInstance();
    (monitor as unknown as { healthCache: null }).healthCache = null;
    (monitor as unknown as { lastCheckTime: null }).lastCheckTime = null;
    // Reset mocks
    Object.assign(prisma, originalPrisma);
    Object.assign(redisConnection, originalRedis);
    vi.restoreAllMocks();
  });

  afterEach(() => {
    // Restore all mocks and originals
    Object.assign(prisma, originalPrisma);
    Object.assign(redisConnection, originalRedis);
    vi.restoreAllMocks();
  });

  it("should return healthy status for all checks passing", async () => {
    const now = Date.now();
    vi.spyOn(Date, "now").mockImplementation(() => now);
    vi.spyOn(prisma, "$queryRaw").mockResolvedValue(1 as any);
    redisConnection.host = "localhost";
    const queueMock: MockQueue = { count: vi.fn().mockResolvedValue(0) };
    (monitor as any).container = {
      queues: {
        noteQueue: queueMock,
        imageQueue: queueMock,
        ingredientQueue: queueMock,
        instructionQueue: queueMock,
        categorizationQueue: queueMock,
      },
    };
    const health = await monitor.getHealth();
    expect(health.status).toBe("healthy");
    expect(health.checks.database.status).toBe("healthy");
    expect(health.checks.redis.status).toBe("healthy");
    Object.values(health.checks.queues).forEach((q: HealthCheck) =>
      expect(q.status).toBe("healthy")
    );
    vi.restoreAllMocks();
  });

  it("should cache health and use cache if not expired", async () => {
    vi.spyOn(prisma, "$queryRaw").mockResolvedValue(1 as any);
    redisConnection.host = "localhost";
    const queueMock: MockQueue = { count: vi.fn().mockResolvedValue(0) };
    (monitor as any).container = {
      queues: {
        noteQueue: queueMock,
        imageQueue: queueMock,
        ingredientQueue: queueMock,
        instructionQueue: queueMock,
        categorizationQueue: queueMock,
      },
    };
    const health1 = await monitor.getHealth();
    (monitor as any).healthCache = health1;
    (monitor as any).lastCheckTime = new Date();
    const health2 = await monitor.getHealth();
    expect(health2).toBe(health1);
  });

  it("should refresh health and bypass cache", async () => {
    vi.spyOn(prisma, "$queryRaw").mockResolvedValue(1 as any);
    redisConnection.host = "localhost";
    const queueMock: MockQueue = { count: vi.fn().mockResolvedValue(0) };
    (monitor as any).container = {
      queues: {
        noteQueue: queueMock,
        imageQueue: queueMock,
        ingredientQueue: queueMock,
        instructionQueue: queueMock,
        categorizationQueue: queueMock,
      },
    };
    const health1 = await monitor.getHealth();
    (monitor as any).healthCache = health1;
    (monitor as any).lastCheckTime = new Date();
    const health2 = await monitor.refreshHealth();
    expect(health2).not.toBe(health1);
    expect(health2.timestamp.getTime()).toBeGreaterThanOrEqual(
      health1.timestamp.getTime()
    );
  });

  it("should handle database error", async () => {
    vi.spyOn(prisma, "$queryRaw").mockRejectedValue(new Error("db fail"));
    redisConnection.host = "localhost";
    const queueMock: MockQueue = { count: vi.fn().mockResolvedValue(0) };
    (monitor as any).container = {
      queues: {
        noteQueue: queueMock,
        imageQueue: queueMock,
        ingredientQueue: queueMock,
        instructionQueue: queueMock,
        categorizationQueue: queueMock,
      },
    };
    const health = await monitor.getHealth();
    expect(health.checks.database.status).toBe("unhealthy");
    expect(health.status).toBe("unhealthy");
  });

  it("should handle redis error", async () => {
    vi.spyOn(prisma, "$queryRaw").mockResolvedValue(1 as any);
    // Remove redis host to trigger redis error
    redisConnection.host = undefined;
    const queueMock: MockQueue = { count: vi.fn().mockResolvedValue(0) };
    (monitor as any).container = {
      queues: {
        noteQueue: queueMock,
        imageQueue: queueMock,
        ingredientQueue: queueMock,
        instructionQueue: queueMock,
        categorizationQueue: queueMock,
      },
    };
    const health = await monitor.getHealth();
    expect(health.checks.redis.status).toBe("unhealthy");
    expect(health.status).toBe("unhealthy");
  });

  it("should handle queue error", async () => {
    vi.spyOn(prisma, "$queryRaw").mockResolvedValue(1 as any);
    // Remove redis host to trigger queue error (queues depend on Redis)
    redisConnection.host = undefined;
    const queueMock: MockQueue = {
      count: vi.fn().mockRejectedValue(new Error("queue fail")),
    };
    (monitor as any).container = {
      queues: {
        noteQueue: queueMock,
        imageQueue: queueMock,
        ingredientQueue: queueMock,
        instructionQueue: queueMock,
        categorizationQueue: queueMock,
      },
    };
    const health = await monitor.getHealth();
    Object.values(health.checks.queues).forEach((q: HealthCheck) =>
      expect(q.status).toBe("unhealthy")
    );
    expect(health.status).toBe("unhealthy");
  });

  it("should determine unhealthy if all fail", async () => {
    vi.spyOn(prisma, "$queryRaw").mockRejectedValue(new Error("db fail"));
    redisConnection.host = undefined;
    const queueMock: MockQueue = {
      count: vi.fn().mockRejectedValue(new Error("queue fail")),
    };
    (monitor as any).container = {
      queues: {
        noteQueue: queueMock,
        imageQueue: queueMock,
        ingredientQueue: queueMock,
        instructionQueue: queueMock,
        categorizationQueue: queueMock,
      },
    };
    const health = await monitor.getHealth();
    expect(health.status).toBe("unhealthy");
    expect(health.checks.database.status).toBe("unhealthy");
    expect(health.checks.redis.status).toBe("unhealthy");
    Object.values(health.checks.queues).forEach((q: HealthCheck) =>
      expect(q.status).toBe("unhealthy")
    );
  });

  it("should return isHealthy true for healthy status", async () => {
    vi.spyOn(prisma, "$queryRaw").mockResolvedValue(1 as any);
    redisConnection.host = "localhost";
    const queueMock: MockQueue = { count: vi.fn().mockResolvedValue(0) };
    (monitor as any).container = {
      queues: {
        noteQueue: queueMock,
        imageQueue: queueMock,
        ingredientQueue: queueMock,
        instructionQueue: queueMock,
        categorizationQueue: queueMock,
      },
    };
    await monitor.getHealth();
    expect(await monitor.isHealthy()).toBe(true);
  });

  it("should return isHealthy false for unhealthy status", async () => {
    vi.spyOn(prisma, "$queryRaw").mockRejectedValue(new Error("db fail"));
    redisConnection.host = undefined;
    const queueMock: MockQueue = {
      count: vi.fn().mockRejectedValue(new Error("queue fail")),
    };
    (monitor as any).container = {
      queues: {
        noteQueue: queueMock,
        imageQueue: queueMock,
        ingredientQueue: queueMock,
        instructionQueue: queueMock,
        categorizationQueue: queueMock,
      },
    };
    await monitor.getHealth();
    expect(await monitor.isHealthy()).toBe(false);
  });

  it("should get component health", async () => {
    vi.spyOn(prisma, "$queryRaw").mockResolvedValue(1 as any);
    redisConnection.host = "localhost";
    const queueMock: MockQueue = { count: vi.fn().mockResolvedValue(0) };
    (monitor as any).container = {
      queues: {
        noteQueue: queueMock,
        imageQueue: queueMock,
        ingredientQueue: queueMock,
        instructionQueue: queueMock,
        categorizationQueue: queueMock,
      },
    };
    await monitor.getHealth();
    const dbCheck = (await monitor.getComponentHealth(
      "database"
    )) as HealthCheck;
    const redisCheck = (await monitor.getComponentHealth(
      "redis"
    )) as HealthCheck;
    const queuesCheck = (await monitor.getComponentHealth("queues")) as Record<
      string,
      HealthCheck
    >;
    expect(dbCheck.status).toBe("healthy");
    expect(redisCheck.status).toBe("healthy");
    Object.values(queuesCheck).forEach((q: HealthCheck) =>
      expect(q.status).toBe("healthy")
    );
  });
});
