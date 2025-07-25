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
