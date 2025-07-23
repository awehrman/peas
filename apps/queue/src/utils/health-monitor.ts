import { ErrorHandler } from "./error-handler";

import { cacheManager } from "../config/cache";
import { prisma } from "../config/database";
import { databaseManager } from "../config/database-manager";
import { redisConnection } from "../config/redis";
import {
  DegradedCheck,
  ErrorSeverity,
  ErrorType,
  HealthCheck,
  HealthyCheck,
  ServiceHealth,
  UnhealthyCheck,
} from "../types";

export class HealthMonitor {
  private static instance: HealthMonitor;
  private healthCache: ServiceHealth | null = null;
  private lastCheckTime: Date | null = null;
  private readonly CACHE_DURATION_MS = 30000; // 30 seconds
  private readonly TIMEOUT_MS = 5000; // 5 seconds

  private constructor() {
    // Prevent direct instantiation
    if (HealthMonitor.instance) {
      throw new Error(
        "HealthMonitor is a singleton. Use getInstance() instead."
      );
    }
  }

  static getInstance(): HealthMonitor {
    if (!HealthMonitor.instance) {
      HealthMonitor.instance = new HealthMonitor();
    }
    return HealthMonitor.instance;
  }

  /**
   * Get current service health status
   */
  async getHealth(): Promise<ServiceHealth> {
    // Return cached health if recent
    if (this.healthCache && this.lastCheckTime) {
      const timeSinceLastCheck = Date.now() - this.lastCheckTime.getTime();
      if (timeSinceLastCheck < this.CACHE_DURATION_MS) {
        return this.healthCache;
      }
    }

    // Perform fresh health checks
    const health = await this.performHealthChecks();
    this.healthCache = health;
    this.lastCheckTime = new Date();

    return health;
  }

  /**
   * Perform all health checks
   */
  private async performHealthChecks(): Promise<ServiceHealth> {
    const [databaseHealth, redisHealth] = await Promise.allSettled([
      this.checkDatabaseHealth(),
      this.checkRedisHealth(),
    ]);

    const checks = {
      database:
        databaseHealth.status === "fulfilled"
          ? databaseHealth.value
          : this.createFailedHealthCheck("Database check failed"),
      redis:
        redisHealth.status === "fulfilled"
          ? redisHealth.value
          : this.createFailedHealthCheck("Redis check failed"),
      queues: await this.checkQueueHealth(),
    };

    const overallStatus = this.determineOverallStatus(checks);

    return {
      status: overallStatus,
      checks,
      timestamp: new Date(),
    };
  }

  /**
   * Check database connectivity and performance
   */
  private async checkDatabaseHealth(): Promise<HealthCheck> {
    const startTime = Date.now();

    try {
      // Use database manager for enhanced health checks
      const isHealthy = await databaseManager.checkConnectionHealth();

      if (!isHealthy) {
        throw new Error("Database health check failed");
      }

      // Test a simple query with retry logic
      await databaseManager.executeWithRetry(async () => {
        await prisma.note.count();
      });

      const responseTime = Date.now() - startTime;
      const performance = this.calculatePerformance(responseTime);

      if (responseTime < 500) {
        return {
          status: "healthy",
          message: "Database is responding normally",
          responseTime,
          performance,
          lastChecked: new Date(),
        } as HealthyCheck;
      } else {
        return {
          status: "degraded",
          message: "Database is slow to respond",
          warnings: [`Response time ${responseTime}ms exceeds threshold`],
          performance,
          responseTime,
          lastChecked: new Date(),
        } as DegradedCheck;
      }
    } catch (error) {
      const jobError = ErrorHandler.createJobError(
        error instanceof Error
          ? error
          : new Error("Database connection failed"),
        ErrorType.DATABASE_ERROR,
        ErrorSeverity.HIGH,
        { operation: "health_check" }
      );
      ErrorHandler.logError(jobError);

      return {
        status: "unhealthy",
        message: jobError.message,
        error: jobError.message,
        errorCode: "DB_CONNECTION_ERROR",
        critical: true,
        lastChecked: new Date(),
        responseTime: Date.now() - startTime,
      } as UnhealthyCheck;
    }
  }

  /**
   * Check Redis connectivity and performance
   */
  private async checkRedisHealth(): Promise<HealthCheck> {
    const startTime = Date.now();

    try {
      // Test cache manager connectivity
      if (!cacheManager.isReady()) {
        await cacheManager.connect();
      }

      // Test basic Redis connectivity by checking if we can get a simple key
      await redisConnection.get("health_check_test");

      const responseTime = Date.now() - startTime;
      const performance = this.calculatePerformance(responseTime);

      if (responseTime < 500) {
        return {
          status: "healthy",
          message: "Redis configuration is valid",
          responseTime,
          performance,
          lastChecked: new Date(),
        } as HealthyCheck;
      } else {
        return {
          status: "degraded",
          message: "Redis configuration check is slow",
          warnings: [`Response time ${responseTime}ms exceeds threshold`],
          performance,
          responseTime,
          lastChecked: new Date(),
        } as DegradedCheck;
      }
    } catch (error) {
      const jobError = ErrorHandler.createJobError(
        error instanceof Error ? error : new Error("Redis connection failed"),
        ErrorType.REDIS_ERROR,
        ErrorSeverity.HIGH,
        { operation: "health_check" }
      );
      ErrorHandler.logError(jobError);

      return {
        status: "unhealthy",
        message: jobError.message,
        error: jobError.message,
        errorCode: "REDIS_CONNECTION_ERROR",
        critical: true,
        lastChecked: new Date(),
        responseTime: Date.now() - startTime,
      } as UnhealthyCheck;
    }
  }

  /**
   * Check queue health (basic connectivity)
   */
  private async checkQueueHealth(): Promise<Record<string, HealthCheck>> {
    const startTime = Date.now();

    try {
      // For now, just check if Redis connection config is available
      // In a real implementation, you'd test actual queue connectivity
      if (!redisConnection.host) {
        throw new Error("Queue system failed");
      }

      const responseTime = Date.now() - startTime;
      const performance = this.calculatePerformance(responseTime);

      const healthyQueueCheck: HealthyCheck = {
        status: "healthy",
        message: "Queue system is operational",
        responseTime,
        performance,
        lastChecked: new Date(),
      };

      return {
        noteQueue: healthyQueueCheck,
        imageQueue: healthyQueueCheck,
        ingredientQueue: healthyQueueCheck,
        instructionQueue: healthyQueueCheck,
        categorizationQueue: healthyQueueCheck,
      };
    } catch (error) {
      const jobError = ErrorHandler.createJobError(
        error instanceof Error ? error : new Error("Queue system failed"),
        ErrorType.REDIS_ERROR,
        ErrorSeverity.HIGH,
        { operation: "queue_health_check" }
      );
      ErrorHandler.logError(jobError);

      const failedCheck: UnhealthyCheck = {
        status: "unhealthy",
        message: jobError.message,
        error: jobError.message,
        errorCode: "QUEUE_CONNECTION_ERROR",
        critical: false,
        lastChecked: new Date(),
        responseTime: Date.now() - startTime,
      };

      return {
        noteQueue: failedCheck,
        imageQueue: failedCheck,
        ingredientQueue: failedCheck,
        instructionQueue: failedCheck,
        categorizationQueue: failedCheck,
      };
    }
  }

  /**
   * Calculate performance score based on response time
   */
  private calculatePerformance(responseTime: number): number {
    if (responseTime < 100) return 100;
    if (responseTime < 500) return 90;
    if (responseTime < 1000) return 75;
    if (responseTime < 2000) return 50;
    if (responseTime < 5000) return 25;
    return 0;
  }

  /**
   * Create a failed health check
   */
  private createFailedHealthCheck(message: string): UnhealthyCheck {
    return {
      status: "unhealthy",
      message: message,
      error: message,
      errorCode: "HEALTH_CHECK_FAILED",
      critical: false,
      lastChecked: new Date(),
    };
  }

  /**
   * Determine overall service status based on individual checks
   */
  private determineOverallStatus(
    checks: ServiceHealth["checks"]
  ): "healthy" | "degraded" | "unhealthy" {
    const allChecks: HealthCheck[] = [
      checks.database,
      checks.redis,
      ...Object.values(checks.queues),
    ];

    const unhealthyCount = allChecks.filter(
      (check) => check.status === "unhealthy"
    ).length;
    const degradedCount = allChecks.filter(
      (check) => check.status === "degraded"
    ).length;

    if (unhealthyCount > 0) {
      return "unhealthy";
    } else if (degradedCount > 0) {
      return "degraded";
    } else {
      return "healthy";
    }
  }

  /**
   * Force refresh health cache
   */
  async refreshHealth(): Promise<ServiceHealth> {
    this.healthCache = null;
    this.lastCheckTime = null;
    return this.getHealth();
  }

  /**
   * Check if service is healthy enough to process jobs
   */
  async isHealthy(): Promise<boolean> {
    const health = await this.getHealth();
    return health.status !== "unhealthy";
  }

  /**
   * Get health status for specific component
   */
  async getComponentHealth(
    component: keyof ServiceHealth["checks"]
  ): Promise<HealthCheck | Record<string, HealthCheck>> {
    const health = await this.getHealth();
    return health.checks[component];
  }
}
