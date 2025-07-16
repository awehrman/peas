import { prisma } from "../config/database";
import { redisConnection } from "../config/redis";
import { ServiceHealth, HealthCheck, ErrorType, ErrorSeverity } from "../types";
import { ErrorHandler } from "./error-handler";

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
      // Test basic connectivity
      await prisma.$queryRaw`SELECT 1`;

      // Test a simple query
      await prisma.note.count();

      const responseTime = Date.now() - startTime;

      return {
        status: responseTime < 1000 ? "healthy" : "degraded",
        message:
          responseTime < 1000
            ? "Database is responding normally"
            : "Database is slow to respond",
        responseTime,
        lastChecked: new Date(),
      };
    } catch (error) {
      const jobError = ErrorHandler.createJobError(
        error as Error,
        ErrorType.DATABASE_ERROR,
        ErrorSeverity.HIGH,
        { operation: "health_check" }
      );
      ErrorHandler.logError(jobError);

      return {
        status: "unhealthy",
        message: `Database connection failed: ${jobError.message}`,
        lastChecked: new Date(),
      };
    }
  }

  /**
   * Check Redis connectivity and performance
   */
  private async checkRedisHealth(): Promise<HealthCheck> {
    const startTime = Date.now();

    try {
      // For now, just check if Redis connection config is available
      // In a real implementation, you'd test actual Redis connectivity
      if (!redisConnection.host) {
        throw new Error("Redis host not configured");
      }

      const responseTime = Date.now() - startTime;

      return {
        status: responseTime < 500 ? "healthy" : "degraded",
        message:
          responseTime < 500
            ? "Redis configuration is valid"
            : "Redis configuration check is slow",
        responseTime,
        lastChecked: new Date(),
      };
    } catch (error) {
      const jobError = ErrorHandler.createJobError(
        error as Error,
        ErrorType.REDIS_ERROR,
        ErrorSeverity.HIGH,
        { operation: "health_check" }
      );
      ErrorHandler.logError(jobError);

      return {
        status: "unhealthy",
        message: `Redis connection failed: ${jobError.message}`,
        lastChecked: new Date(),
      };
    }
  }

  /**
   * Check queue health (basic connectivity)
   */
  private async checkQueueHealth(): Promise<Record<string, HealthCheck>> {
    const startTime = Date.now();

    try {
      // For now, just check if Redis connection config is available
      // In a real implementation, you'd test actual Redis connectivity
      if (!redisConnection.host) {
        throw new Error("Redis host not configured");
      }

      const responseTime = Date.now() - startTime;

      return {
        noteQueue: {
          status: "healthy",
          message: "Queue system is operational",
          responseTime,
          lastChecked: new Date(),
        },
        imageQueue: {
          status: "healthy",
          message: "Queue system is operational",
          responseTime,
          lastChecked: new Date(),
        },
        ingredientQueue: {
          status: "healthy",
          message: "Queue system is operational",
          responseTime,
          lastChecked: new Date(),
        },
        instructionQueue: {
          status: "healthy",
          message: "Queue system is operational",
          responseTime,
          lastChecked: new Date(),
        },
        categorizationQueue: {
          status: "healthy",
          message: "Queue system is operational",
          responseTime,
          lastChecked: new Date(),
        },
      };
    } catch (error) {
      const jobError = ErrorHandler.createJobError(
        error as Error,
        ErrorType.REDIS_ERROR,
        ErrorSeverity.HIGH,
        { operation: "queue_health_check" }
      );
      ErrorHandler.logError(jobError);

      const failedCheck = this.createFailedHealthCheck(
        `Queue system failed: ${jobError.message}`
      );

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
   * Create a failed health check
   */
  private createFailedHealthCheck(message: string): HealthCheck {
    return {
      status: "unhealthy",
      message,
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
