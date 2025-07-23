import { z } from "zod";
import { createLogger } from "../utils/standardized-logger";

// ============================================================================
// STANDARDIZED CONFIGURATION
// ============================================================================

/**
 * Base configuration interface
 */
export interface BaseConfig {
  environment: string;
  version: string;
  debug: boolean;
}

/**
 * Server configuration
 */
export interface ServerConfig extends BaseConfig {
  port: number;
  host: string;
  wsPort: number;
  wsHost: string;
}

/**
 * Database configuration
 */
export interface DatabaseConfig extends BaseConfig {
  url: string;
  maxConnections: number;
  connectionTimeout: number;
  queryTimeout: number;
}

/**
 * Redis configuration
 */
export interface RedisConfig extends BaseConfig {
  host: string;
  port: number;
  username?: string;
  password?: string;
  database: number;
  connectionTimeout: number;
  retryAttempts: number;
}

/**
 * Queue configuration
 */
export interface QueueConfig extends BaseConfig {
  batchSize: number;
  maxRetries: number;
  backoffMs: number;
  maxBackoffMs: number;
  jobTimeout: number;
  concurrency: number;
}

/**
 * Security configuration
 */
export interface SecurityConfig extends BaseConfig {
  jwtSecret: string;
  apiKey?: string;
  rateLimitWindowMs: number;
  rateLimitMaxRequests: number;
  maxRequestSizeBytes: number;
}

/**
 * Logging configuration
 */
export interface LoggingConfig extends BaseConfig {
  level: "debug" | "info" | "warn" | "error" | "fatal";
  enableFileLogging: boolean;
  enableConsoleLogging: boolean;
  logDir: string;
  maxLogSizeMB: number;
  maxLogFiles: number;
}

/**
 * Monitoring configuration
 */
export interface MonitoringConfig extends BaseConfig {
  enabled: boolean;
  metricsRetentionHours: number;
  healthCheckIntervalMs: number;
  cleanupIntervalMs: number;
  maxMetricsHistory: number;
}

/**
 * Complete application configuration
 */
export interface AppConfig extends BaseConfig {
  server: ServerConfig;
  database: DatabaseConfig;
  redis: RedisConfig;
  queue: QueueConfig;
  security: SecurityConfig;
  logging: LoggingConfig;
  monitoring: MonitoringConfig;
}

// ============================================================================
// CONFIGURATION SCHEMAS
// ============================================================================

const BaseConfigSchema = z.object({
  environment: z.enum(["development", "test", "production"]).default("development"),
  version: z.string().default("1.0.0"),
  debug: z.boolean().default(false),
});

const ServerConfigSchema = BaseConfigSchema.extend({
  port: z.number().min(1).max(65535).default(3000),
  host: z.string().default("localhost"),
  wsPort: z.number().min(1).max(65535).default(3001),
  wsHost: z.string().default("localhost"),
});

const DatabaseConfigSchema = BaseConfigSchema.extend({
  url: z.string().url("Invalid database URL"),
  maxConnections: z.number().positive().default(10),
  connectionTimeout: z.number().positive().default(30000),
  queryTimeout: z.number().positive().default(10000),
});

const RedisConfigSchema = BaseConfigSchema.extend({
  host: z.string().default("localhost"),
  port: z.number().min(1).max(65535).default(6379),
  username: z.string().optional(),
  password: z.string().optional(),
  database: z.number().min(0).max(15).default(0),
  connectionTimeout: z.number().positive().default(5000),
  retryAttempts: z.number().positive().default(3),
});

const QueueConfigSchema = BaseConfigSchema.extend({
  batchSize: z.number().positive().default(10),
  maxRetries: z.number().min(0).default(3),
  backoffMs: z.number().positive().default(1000),
  maxBackoffMs: z.number().positive().default(30000),
  jobTimeout: z.number().positive().default(30000),
  concurrency: z.number().positive().default(5),
});

const SecurityConfigSchema = BaseConfigSchema.extend({
  jwtSecret: z.string().min(32, "JWT secret must be at least 32 characters"),
  apiKey: z.string().min(16, "API key must be at least 16 characters").optional(),
  rateLimitWindowMs: z.number().positive().default(900000), // 15 minutes
  rateLimitMaxRequests: z.number().positive().default(100),
  maxRequestSizeBytes: z.number().positive().default(10485760), // 10MB
});

const LoggingConfigSchema = BaseConfigSchema.extend({
  level: z.enum(["debug", "info", "warn", "error", "fatal"]).default("info"),
  enableFileLogging: z.boolean().default(true),
  enableConsoleLogging: z.boolean().default(true),
  logDir: z.string().default("logs"),
  maxLogSizeMB: z.number().positive().default(10),
  maxLogFiles: z.number().positive().default(5),
});

const MonitoringConfigSchema = BaseConfigSchema.extend({
  enabled: z.boolean().default(true),
  metricsRetentionHours: z.number().positive().default(24),
  healthCheckIntervalMs: z.number().positive().default(30000),
  cleanupIntervalMs: z.number().positive().default(3600000), // 1 hour
  maxMetricsHistory: z.number().positive().default(1000),
});

const AppConfigSchema = BaseConfigSchema.extend({
  server: ServerConfigSchema,
  database: DatabaseConfigSchema,
  redis: RedisConfigSchema,
  queue: QueueConfigSchema,
  security: SecurityConfigSchema,
  logging: LoggingConfigSchema,
  monitoring: MonitoringConfigSchema,
});

// ============================================================================
// CONFIGURATION MANAGER
// ============================================================================

/**
 * Standardized configuration manager
 */
export class ConfigurationManager {
  private static instance: ConfigurationManager | null = null;
  private config: AppConfig | null = null;
  private logger = createLogger("ConfigurationManager");

  private constructor() {}

  static getInstance(): ConfigurationManager {
    if (!ConfigurationManager.instance) {
      ConfigurationManager.instance = new ConfigurationManager();
    }
    return ConfigurationManager.instance;
  }

  /**
   * Load configuration from environment variables
   */
  loadConfig(): AppConfig {
    if (this.config) {
      return this.config;
    }

    try {
      const environment = process.env.NODE_ENV || "development";
      const version = process.env.npm_package_version || "1.0.0";
      const debug = environment === "development";

      const baseConfig = {
        environment,
        version,
        debug,
      };

      const config: AppConfig = {
        ...baseConfig,
        server: {
          ...baseConfig,
          port: parseInt(process.env.PORT || "3000", 10),
          host: process.env.HOST || "localhost",
          wsPort: parseInt(process.env.WS_PORT || "3001", 10),
          wsHost: process.env.WS_HOST || "localhost",
        },
        database: {
          ...baseConfig,
          url: process.env.DATABASE_URL || "postgresql://localhost:5432/peas",
          maxConnections: parseInt(process.env.DB_MAX_CONNECTIONS || "10", 10),
          connectionTimeout: parseInt(process.env.DB_CONNECTION_TIMEOUT || "30000", 10),
          queryTimeout: parseInt(process.env.DB_QUERY_TIMEOUT || "10000", 10),
        },
        redis: {
          ...baseConfig,
          host: process.env.REDISHOST || "localhost",
          port: parseInt(process.env.REDISPORT || "6379", 10),
          username: process.env.REDISUSERNAME,
          password: process.env.REDISPASSWORD,
          database: parseInt(process.env.REDIS_DATABASE || "0", 10),
          connectionTimeout: parseInt(process.env.REDIS_CONNECTION_TIMEOUT || "5000", 10),
          retryAttempts: parseInt(process.env.REDIS_RETRY_ATTEMPTS || "3", 10),
        },
        queue: {
          ...baseConfig,
          batchSize: parseInt(process.env.BATCH_SIZE || "10", 10),
          maxRetries: parseInt(process.env.MAX_RETRIES || "3", 10),
          backoffMs: parseInt(process.env.BACKOFF_MS || "1000", 10),
          maxBackoffMs: parseInt(process.env.MAX_BACKOFF_MS || "30000", 10),
          jobTimeout: parseInt(process.env.JOB_TIMEOUT || "30000", 10),
          concurrency: parseInt(process.env.CONCURRENCY || "5", 10),
        },
        security: {
          ...baseConfig,
          jwtSecret: process.env.JWT_SECRET || "default-jwt-secret-change-in-production",
          apiKey: process.env.API_KEY,
          rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || "900000", 10),
          rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || "100", 10),
          maxRequestSizeBytes: parseInt(process.env.MAX_REQUEST_SIZE_BYTES || "10485760", 10),
        },
        logging: {
          ...baseConfig,
          level: (process.env.LOG_LEVEL as "debug" | "info" | "warn" | "error" | "fatal") || "info",
          enableFileLogging: process.env.ENABLE_FILE_LOGGING !== "false",
          enableConsoleLogging: process.env.ENABLE_CONSOLE_LOGGING !== "false",
          logDir: process.env.LOG_DIR || "logs",
          maxLogSizeMB: parseInt(process.env.MAX_LOG_SIZE_MB || "10", 10),
          maxLogFiles: parseInt(process.env.MAX_LOG_FILES || "5", 10),
        },
        monitoring: {
          ...baseConfig,
          enabled: process.env.MONITORING_ENABLED !== "false",
          metricsRetentionHours: parseInt(process.env.METRICS_RETENTION_HOURS || "24", 10),
          healthCheckIntervalMs: parseInt(process.env.HEALTH_CHECK_INTERVAL_MS || "30000", 10),
          cleanupIntervalMs: parseInt(process.env.CLEANUP_INTERVAL_MS || "3600000", 10),
          maxMetricsHistory: parseInt(process.env.MAX_METRICS_HISTORY || "1000", 10),
        },
      };

      // Validate configuration
      const validatedConfig = AppConfigSchema.parse(config);
      this.config = validatedConfig;

      this.logger.info("Configuration loaded successfully", {
        environment: config.environment,
        version: config.version,
        debug: config.debug,
      });

      return this.config;
    } catch (error) {
      this.logger.error("Failed to load configuration", { error: error instanceof Error ? error.message : String(error) });
      throw new Error(`Configuration validation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get the current configuration
   */
  getConfig(): AppConfig {
    if (!this.config) {
      return this.loadConfig();
    }
    return this.config;
  }

  /**
   * Get a specific configuration section
   */
  getServerConfig(): ServerConfig {
    return this.getConfig().server;
  }

  getDatabaseConfig(): DatabaseConfig {
    return this.getConfig().database;
  }

  getRedisConfig(): RedisConfig {
    return this.getConfig().redis;
  }

  getQueueConfig(): QueueConfig {
    return this.getConfig().queue;
  }

  getSecurityConfig(): SecurityConfig {
    return this.getConfig().security;
  }

  getLoggingConfig(): LoggingConfig {
    return this.getConfig().logging;
  }

  getMonitoringConfig(): MonitoringConfig {
    return this.getConfig().monitoring;
  }

  /**
   * Reload configuration (useful for testing)
   */
  reloadConfig(): AppConfig {
    this.config = null;
    return this.loadConfig();
  }

  /**
   * Validate configuration without loading
   */
  validateConfig(config: Partial<AppConfig>): AppConfig {
    return AppConfigSchema.parse(config);
  }
}

// ============================================================================
// CONFIGURATION INSTANCE
// ============================================================================

export const configManager = ConfigurationManager.getInstance();

// ============================================================================
// CONFIGURATION UTILITIES
// ============================================================================

/**
 * Get configuration with automatic loading
 */
export function getConfig(): AppConfig {
  return configManager.getConfig();
}

/**
 * Get server configuration
 */
export function getServerConfig(): ServerConfig {
  return configManager.getServerConfig();
}

/**
 * Get database configuration
 */
export function getDatabaseConfig(): DatabaseConfig {
  return configManager.getDatabaseConfig();
}

/**
 * Get Redis configuration
 */
export function getRedisConfig(): RedisConfig {
  return configManager.getRedisConfig();
}

/**
 * Get queue configuration
 */
export function getQueueConfig(): QueueConfig {
  return configManager.getQueueConfig();
}

/**
 * Get security configuration
 */
export function getSecurityConfig(): SecurityConfig {
  return configManager.getSecurityConfig();
}

/**
 * Get logging configuration
 */
export function getLoggingConfig(): LoggingConfig {
  return configManager.getLoggingConfig();
}

/**
 * Get monitoring configuration
 */
export function getMonitoringConfig(): MonitoringConfig {
  return configManager.getMonitoringConfig();
}

// ============================================================================
// EXPORTS
// ============================================================================

export default configManager; 