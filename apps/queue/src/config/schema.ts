import { z } from "zod";

export const BaseConfigSchema = z.object({
  environment: z
    .enum(["development", "test", "production"])
    .default("development"),
  version: z.string().default("1.0.0"),
  debug: z.boolean().default(false),
});

export const ServerConfigSchema = BaseConfigSchema.extend({
  port: z.number().min(1).max(65535).default(3000),
  host: z.string().default("localhost"),
  wsPort: z.number().min(1).max(65535).default(8080),
  wsHost: z.string().default("localhost"),
});

export const DatabaseConfigSchema = BaseConfigSchema.extend({
  url: z.string().url("Invalid database URL"),
  maxConnections: z.number().positive().default(10),
  connectionTimeout: z.number().positive().default(30000),
  queryTimeout: z.number().positive().default(10000),
});

export const RedisConfigSchema = BaseConfigSchema.extend({
  host: z.string().default("localhost"),
  port: z.number().min(1).max(65535).default(6379),
  username: z.string().optional(),
  password: z.string().optional(),
  database: z.number().min(0).max(15).default(0),
  connectionTimeout: z.number().positive().default(5000),
  retryAttempts: z.number().positive().default(3),
});

export const QueueConfigSchema = BaseConfigSchema.extend({
  batchSize: z.number().positive().default(10),
  maxRetries: z.number().min(0).default(3),
  backoffMs: z.number().positive().default(1000),
  maxBackoffMs: z.number().positive().default(30000),
  jobTimeout: z.number().positive().default(30000),
  concurrency: z.number().positive().default(5),
});

export const SecurityConfigSchema = BaseConfigSchema.extend({
  jwtSecret: z.string().min(32, "JWT secret must be at least 32 characters"),
  apiKey: z
    .string()
    .min(16, "API key must be at least 16 characters")
    .optional(),
  rateLimitWindowMs: z.number().positive().default(900000), // 15 minutes
  rateLimitMaxRequests: z.number().positive().default(100),
  maxRequestSizeBytes: z.number().positive().default(10485760), // 10MB
});

export const LoggingConfigSchema = BaseConfigSchema.extend({
  level: z.enum(["debug", "info", "warn", "error", "fatal"]).default("info"),
  enableFileLogging: z.boolean().default(true),
  enableConsoleLogging: z.boolean().default(true),
  logDir: z.string().default("logs"),
  maxLogSizeMB: z.number().positive().default(10),
  maxLogFiles: z.number().positive().default(5),
});

export const MonitoringConfigSchema = BaseConfigSchema.extend({
  enabled: z.boolean().default(true),
  metricsRetentionHours: z.number().positive().default(24),
  healthCheckIntervalMs: z.number().positive().default(30000),
  cleanupIntervalMs: z.number().positive().default(3600000), // 1 hour
  maxMetricsHistory: z.number().positive().default(1000),
});

export const AppConfigSchema = BaseConfigSchema.extend({
  server: ServerConfigSchema,
  database: DatabaseConfigSchema,
  redis: RedisConfigSchema,
  queue: QueueConfigSchema,
  security: SecurityConfigSchema,
  logging: LoggingConfigSchema,
  monitoring: MonitoringConfigSchema,
});
