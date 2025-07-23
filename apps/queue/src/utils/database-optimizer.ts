import { performanceOptimizer } from "./performance-optimizer";
import { createLogger } from "./standardized-logger";

import { configManager } from "../config/standardized-config";

// ============================================================================
// DATABASE OPTIMIZER
// ============================================================================

/**
 * Database query optimization options
 */
export interface DatabaseOptimizationOptions {
  enableQueryCaching: boolean;
  enableBatchOperations: boolean;
  enableConnectionPooling: boolean;
  maxBatchSize: number;
  queryTimeout: number;
  maxConnections: number;
}

/**
 * Optimized database query result
 */
export interface OptimizedQueryResult<T> {
  data: T;
  executionTime: number;
  cached: boolean;
  optimized: boolean;
}

/**
 * Batch operation result
 */
export interface BatchOperationResult<T> {
  results: T[];
  totalTime: number;
  batchCount: number;
  successCount: number;
  errorCount: number;
}

/**
 * Database optimizer class
 */
export class DatabaseOptimizer {
  private logger = createLogger("DatabaseOptimizer");
  private queryCache = new Map<
    string,
    { data: unknown; timestamp: number; ttl: number }
  >();
  private options: DatabaseOptimizationOptions;

  constructor(options: Partial<DatabaseOptimizationOptions> = {}) {
    const config = configManager.getConfig();
    this.options = {
      enableQueryCaching: true,
      enableBatchOperations: true,
      enableConnectionPooling: true,
      maxBatchSize: config.queue.batchSize,
      queryTimeout: config.database.queryTimeout,
      maxConnections: config.database.maxConnections,
      ...options,
    };
  }

  /**
   * Execute an optimized database query
   */
  async executeQuery<T>(
    queryName: string,
    queryFn: () => Promise<T>,
    cacheKey?: string,
    cacheTTL: number = 300000 // 5 minutes
  ): Promise<OptimizedQueryResult<T>> {
    const startTime = Date.now();

    // Check cache first
    if (this.options.enableQueryCaching && cacheKey) {
      const cached = this.queryCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < cached.ttl) {
        return {
          data: cached.data as T,
          executionTime: 0,
          cached: true,
          optimized: true,
        };
      }
    }

    // Execute query with performance profiling
    const data = await performanceOptimizer.profile(
      `database_query_${queryName}`,
      queryFn,
      { queryName, cacheKey }
    );

    const executionTime = Date.now() - startTime;

    // Cache the result
    if (this.options.enableQueryCaching && cacheKey) {
      this.queryCache.set(cacheKey, {
        data,
        timestamp: Date.now(),
        ttl: cacheTTL,
      });
    }

    return {
      data,
      executionTime,
      cached: false,
      optimized: executionTime < 100, // Consider optimized if under 100ms
    };
  }

  /**
   * Execute batch operations for better performance
   */
  async executeBatchOperations<T, R>(
    items: T[],
    operation: (batch: T[]) => Promise<R[]>,
    batchSize?: number
  ): Promise<BatchOperationResult<R>> {
    const startTime = Date.now();
    const maxBatchSize = batchSize || this.options.maxBatchSize;
    const batches = this.chunkArray(items, maxBatchSize);
    const results: R[] = [];
    let successCount = 0;
    let errorCount = 0;

    for (const batch of batches) {
      try {
        const batchResults = await performanceOptimizer.profile(
          "batch_operation",
          () => operation(batch),
          { batchSize: batch.length, totalItems: items.length }
        );
        results.push(...batchResults);
        successCount += batch.length;
      } catch (error) {
        this.logger.error("Batch operation failed", {
          error: error instanceof Error ? error.message : String(error),
          batchSize: batch.length,
        });
        errorCount += batch.length;
      }
    }

    const totalTime = Date.now() - startTime;

    return {
      results,
      totalTime,
      batchCount: batches.length,
      successCount,
      errorCount,
    };
  }

  /**
   * Optimize Prisma queries with select and include optimization
   */
  optimizePrismaQuery(
    query: Record<string, unknown>,
    options: {
      select?: Record<string, boolean>;
      include?: Record<string, boolean>;
      take?: number;
      skip?: number;
      orderBy?: Record<string, unknown>;
      where?: Record<string, unknown>;
    } = {}
  ): Record<string, unknown> {
    const optimizedQuery = { ...query };

    // Add select to limit fields
    if (options.select) {
      optimizedQuery.select = options.select;
    }

    // Add include for relations
    if (options.include) {
      optimizedQuery.include = options.include;
    }

    // Add pagination
    if (options.take) {
      optimizedQuery.take = options.take;
    }

    if (options.skip) {
      optimizedQuery.skip = options.skip;
    }

    // Add ordering
    if (options.orderBy) {
      optimizedQuery.orderBy = options.orderBy;
    }

    // Add where conditions
    if (options.where) {
      optimizedQuery.where = options.where;
    }

    return optimizedQuery;
  }

  /**
   * Create optimized findMany query
   */
  createOptimizedFindManyQuery(
    model: string,
    options: {
      select?: Record<string, boolean>;
      where?: Record<string, unknown>;
      orderBy?: Record<string, unknown>;
      take?: number;
      skip?: number;
      include?: Record<string, boolean>;
    } = {}
  ) {
    return this.optimizePrismaQuery(
      {},
      {
        select: options.select,
        where: options.where,
        orderBy: options.orderBy,
        take: options.take || 100, // Default limit
        skip: options.skip,
        include: options.include,
      }
    );
  }

  /**
   * Create optimized findUnique query
   */
  createOptimizedFindUniqueQuery(
    model: string,
    options: {
      select?: Record<string, boolean>;
      include?: Record<string, boolean>;
    } = {}
  ) {
    return this.optimizePrismaQuery(
      {},
      {
        select: options.select,
        include: options.include,
      }
    );
  }

  /**
   * Create optimized create query
   */
  createOptimizedCreateQuery(
    model: string,
    options: {
      select?: Record<string, boolean>;
      include?: Record<string, boolean>;
    } = {}
  ) {
    return this.optimizePrismaQuery(
      {},
      {
        select: options.select,
        include: options.include,
      }
    );
  }

  /**
   * Create optimized update query
   */
  createOptimizedUpdateQuery(
    model: string,
    options: {
      select?: Record<string, boolean>;
      include?: Record<string, boolean>;
    } = {}
  ) {
    return this.optimizePrismaQuery(
      {},
      {
        select: options.select,
        include: options.include,
      }
    );
  }

  /**
   * Clear query cache
   */
  clearQueryCache(): void {
    this.queryCache.clear();
    this.logger.info("Query cache cleared");
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    size: number;
    hitRate: number;
    missRate: number;
  } {
    const size = this.queryCache.size;
    // This is a simplified calculation - in a real implementation,
    // you'd track actual hits and misses
    const hitRate = 0.8; // Placeholder
    const missRate = 0.2; // Placeholder

    return {
      size,
      hitRate,
      missRate,
    };
  }

  /**
   * Optimize database connection settings
   */
  getOptimizedConnectionConfig() {
    return {
      pool: {
        min: 2,
        max: this.options.maxConnections,
        acquireTimeoutMillis: this.options.queryTimeout,
        createTimeoutMillis: this.options.queryTimeout,
        destroyTimeoutMillis: 5000,
        idleTimeoutMillis: 30000,
        reapIntervalMillis: 1000,
        createRetryIntervalMillis: 200,
      },
      connection: {
        timeout: this.options.queryTimeout,
      },
    };
  }

  /**
   * Generate cache key for queries
   */
  generateCacheKey(operation: string, params: Record<string, unknown>): string {
    const sortedParams = Object.keys(params)
      .sort()
      .reduce(
        (result, key) => {
          result[key] = params[key];
          return result;
        },
        {} as Record<string, unknown>
      );

    return `${operation}:${JSON.stringify(sortedParams)}`;
  }

  /**
   * Clean up expired cache entries
   */
  cleanupExpiredCache(): void {
    const now = Date.now();
    let expiredCount = 0;

    for (const [key, entry] of this.queryCache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.queryCache.delete(key);
        expiredCount++;
      }
    }

    if (expiredCount > 0) {
      this.logger.info(`Cleaned up ${expiredCount} expired cache entries`);
    }
  }

  /**
   * Split array into chunks
   */
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }
}

// ============================================================================
// DATABASE OPTIMIZER INSTANCE
// ============================================================================

export const databaseOptimizer = new DatabaseOptimizer();

// ============================================================================
// DATABASE OPTIMIZATION UTILITIES
// ============================================================================

/**
 * Optimize database queries with caching
 */
export async function optimizeQuery<T>(
  queryName: string,
  queryFn: () => Promise<T>,
  cacheKey?: string,
  cacheTTL?: number
): Promise<OptimizedQueryResult<T>> {
  return databaseOptimizer.executeQuery(queryName, queryFn, cacheKey, cacheTTL);
}

/**
 * Execute batch database operations
 */
export async function optimizeBatchOperations<T, R>(
  items: T[],
  operation: (batch: T[]) => Promise<R[]>,
  batchSize?: number
): Promise<BatchOperationResult<R>> {
  return databaseOptimizer.executeBatchOperations(items, operation, batchSize);
}

/**
 * Create optimized Prisma query
 */
export function createOptimizedQuery(
  model: string,
  options: {
    select?: Record<string, boolean>;
    include?: Record<string, boolean>;
    take?: number;
    skip?: number;
    orderBy?: Record<string, unknown>;
    where?: Record<string, unknown>;
  } = {}
) {
  return databaseOptimizer.optimizePrismaQuery({}, options);
}

/**
 * Generate cache key for database operations
 */
export function generateCacheKey(
  operation: string,
  params: Record<string, unknown>
): string {
  return databaseOptimizer.generateCacheKey(operation, params);
}

// ============================================================================
// EXPORTS
// ============================================================================

export default databaseOptimizer;
