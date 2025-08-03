import { prisma } from "./database";

// ============================================================================
// DATABASE CONNECTION MANAGER
// ============================================================================

interface ConnectionStats {
  totalConnections: number;
  activeConnections: number;
  idleConnections: number;
  maxConnections: number;
  connectionErrors: number;
  lastHealthCheck: Date;
  isHealthy: boolean;
}

export class DatabaseManager {
  private static instance: DatabaseManager;
  private connectionStats: ConnectionStats;
  private healthCheckInterval: ReturnType<typeof setInterval> | null = null;
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY = 1000; // 1 second

  private constructor() {
    this.connectionStats = {
      totalConnections: 0,
      activeConnections: 0,
      idleConnections: 0,
      maxConnections: 10,
      connectionErrors: 0,
      lastHealthCheck: new Date(),
      isHealthy: true,
    };
  }

  public static getInstance(): DatabaseManager {
    if (!DatabaseManager.instance) {
      DatabaseManager.instance = new DatabaseManager();
    }
    return DatabaseManager.instance;
  }

  // ============================================================================
  // CONNECTION HEALTH CHECKS
  // ============================================================================

  public async checkConnectionHealth(): Promise<boolean> {
    try {
      const startTime = Date.now();

      // Simple query to test connection
      await prisma.$queryRaw`SELECT 1`;

      const responseTime = Date.now() - startTime;

      this.connectionStats.isHealthy = true;
      this.connectionStats.lastHealthCheck = new Date();

      // Log health check results
      if (process.env.NODE_ENV === "development") {
        console.log(`✅ Database health check passed in ${responseTime}ms`);
      }

      return true;
    } catch (error) {
      this.connectionStats.isHealthy = false;
      this.connectionStats.connectionErrors++;
      this.connectionStats.lastHealthCheck = new Date();

      console.error("❌ Database health check failed:", error);
      return false;
    }
  }

  // ============================================================================
  // CONNECTION RETRY LOGIC
  // ============================================================================

  public async executeWithRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = this.MAX_RETRIES
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;

        // Check if it's a connection-related error
        if (this.isConnectionError(error as Error)) {
          console.warn(
            `⚠️ Database connection attempt ${attempt} failed, retrying...`
          );

          if (attempt < maxRetries) {
            await this.delay(this.RETRY_DELAY * attempt); // Exponential backoff
            continue;
          }
        }

        // If it's not a connection error or we've exhausted retries, throw
        throw error;
      }
    }
    /* istanbul ignore next -- @preserve */
    throw lastError!;
  }

  private isConnectionError(error: Error): boolean {
    const connectionErrorMessages = [
      "connection",
      "timeout",
      "network",
      "ECONNREFUSED",
      "ENOTFOUND",
      "ETIMEDOUT",
      "pool",
    ];

    const errorMessage = error.message.toLowerCase();
    return connectionErrorMessages.some((msg) => errorMessage.includes(msg));
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // ============================================================================
  // CONNECTION STATISTICS
  // ============================================================================

  public getConnectionStats(): ConnectionStats {
    return { ...this.connectionStats };
  }

  public async updateConnectionStats(): Promise<void> {
    try {
      // Get connection pool statistics
      const result = await prisma.$queryRaw<Array<{ count: bigint }>>`
        SELECT count(*) as count 
        FROM pg_stat_activity 
        WHERE datname = current_database()
      `;

      this.connectionStats.activeConnections = Number(result[0]?.count || 0);
      this.connectionStats.totalConnections =
        this.connectionStats.activeConnections;
    } catch (error) {
      console.warn("⚠️ Could not update connection stats:", error);
    }
  }

  // ============================================================================
  // HEALTH MONITORING
  // ============================================================================

  /* istanbul ignore next -- @preserve */
  public startHealthMonitoring(intervalMs: number = 30000): void {
    if (this.healthCheckInterval) {
      this.stopHealthMonitoring();
    }

    this.healthCheckInterval = setInterval(async () => {
      await this.checkConnectionHealth();
      await this.updateConnectionStats();
    }, intervalMs);

    console.log(
      `🔍 Database health monitoring started (${intervalMs}ms interval)`
    );
  }

  public stopHealthMonitoring(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
      console.log("🛑 Database health monitoring stopped");
    }
  }

  // ============================================================================
  // CONNECTION POOL OPTIMIZATION
  // ============================================================================

  public async optimizeConnectionPool(): Promise<void> {
    try {
      // Set connection pool parameters
      await prisma.$executeRaw`
        SET max_connections = 100;
        SET shared_preload_libraries = 'pg_stat_statements';
      `;

      console.log("⚡ Database connection pool optimized");
    } catch (error) {
      console.warn("⚠️ Could not optimize connection pool:", error);
    }
  }

  // ============================================================================
  // GRACEFUL SHUTDOWN
  // ============================================================================

  public async shutdown(): Promise<void> {
    console.log("🔄 Shutting down database manager...");

    this.stopHealthMonitoring();

    try {
      await prisma.$disconnect();
      console.log("✅ Database manager shutdown complete");
    } catch (error) {
      console.error("❌ Error during database manager shutdown:", error);
    }
  }
}

// ============================================================================
// EXPORT SINGLETON INSTANCE (DEPRECATED - Use ManagerFactory instead)
// ============================================================================

// @deprecated Use ManagerFactory.createDatabaseManager() instead
export const databaseManager = DatabaseManager.getInstance();

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

export async function withDatabaseRetry<T>(
  operation: () => Promise<T>,
  maxRetries?: number
): Promise<T> {
  return databaseManager.executeWithRetry(operation, maxRetries);
}

export async function checkDatabaseHealth(): Promise<boolean> {
  return databaseManager.checkConnectionHealth();
}

export function getDatabaseStats(): ConnectionStats {
  return databaseManager.getConnectionStats();
}
