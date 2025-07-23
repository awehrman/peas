// Import Prisma types for better type safety
import type {
  ErrorCode,
  Note,
  NoteStatus,
  NoteStatusEvent,
  ParsedIngredientLine,
  ParsedInstructionLine,
  QueueJob,
  QueueJobStatus,
  QueueJobType,
} from "@peas/database";
import type { Queue } from "bullmq";

// ============================================================================
// ACTION/QUEUE ENUMS AND CONSTANTS
// ============================================================================

export enum ActionName {
  // Note worker actions
  CLEAN_HTML = "clean_html",
  PARSE_HTML = "parse_html",
  SAVE_NOTE = "save_note",
  SCHEDULE_ALL_FOLLOWUP_TASKS = "schedule_all_followup_tasks",
  SCHEDULE_SOURCE = "schedule_source",
  SCHEDULE_IMAGES = "schedule_images",
  SCHEDULE_INGREDIENTS = "schedule_ingredients",
  SCHEDULE_INSTRUCTIONS = "schedule_instructions",

  // Ingredient worker actions
  PROCESS_INGREDIENT_LINE = "process_ingredient_line",
  SAVE_INGREDIENT_LINE = "save_ingredient_line",
  INGREDIENT_COMPLETED_STATUS = "ingredient_completed_status",
  UPDATE_INGREDIENT_COUNT = "update_ingredient_count",
  PROCESS_INGREDIENTS = "process_ingredients",
  SCHEDULE_CATEGORIZATION_AFTER_COMPLETION = "schedule_categorization_after_completion",

  // Instruction worker actions
  PROCESS_INSTRUCTION_LINE = "process_instruction_line",
  SAVE_INSTRUCTION_LINE = "save_instruction_line",
  INSTRUCTION_COMPLETED_STATUS = "instruction_completed_status",
  UPDATE_INSTRUCTION_COUNT = "update_instruction_count",

  // Image worker actions
  PROCESS_IMAGE = "process_image",
  SAVE_IMAGE = "save_image",
  IMAGE_COMPLETED_STATUS = "image_completed_status",

  // Categorization worker actions
  PROCESS_CATEGORIZATION = "process_categorization",
  SAVE_CATEGORIZATION = "save_categorization",
  CATEGORIZATION_COMPLETED_STATUS = "categorization_completed_status",
  TRACK_PATTERN = "track_pattern",
  COMPLETION_STATUS = "completion_status",

  // Source worker actions
  PROCESS_SOURCE = "process_source",
  SAVE_SOURCE = "save_source",
  SOURCE_PROCESSING_STATUS = "source_processing_status",
  SOURCE_COMPLETED_STATUS = "source_completed_status",
  BROADCAST_SOURCE_COMPLETED = "broadcast_source_completed",
}

export enum QueueName {
  NOTES = "notes",
  INGREDIENTS = "ingredients",
  INSTRUCTION = "instruction",
  SOURCE = "source",
  IMAGE = "image",
  CATEGORIZATION = "categorization",
}

export type QueueActionMap = {
  [QueueName.NOTES]: ActionName[];
  [QueueName.INGREDIENTS]: ActionName[];
  [QueueName.INSTRUCTION]: ActionName[];
  [QueueName.IMAGE]: ActionName[];
  [QueueName.CATEGORIZATION]: ActionName[];
  [QueueName.SOURCE]: ActionName[];
};

export const QUEUE_ACTIONS: QueueActionMap = {
  [QueueName.NOTES]: [
    ActionName.CLEAN_HTML,
    ActionName.PARSE_HTML,
    ActionName.SAVE_NOTE,
    ActionName.SCHEDULE_IMAGES,
    ActionName.SCHEDULE_SOURCE,
    ActionName.SCHEDULE_INGREDIENTS,
    ActionName.SCHEDULE_INSTRUCTIONS,
    ActionName.SCHEDULE_ALL_FOLLOWUP_TASKS,
  ],
  [QueueName.INGREDIENTS]: [
    ActionName.PROCESS_INGREDIENT_LINE,
    ActionName.SAVE_INGREDIENT_LINE,
    ActionName.INGREDIENT_COMPLETED_STATUS,
    ActionName.UPDATE_INGREDIENT_COUNT,
    ActionName.PROCESS_INGREDIENTS,
    ActionName.SCHEDULE_CATEGORIZATION_AFTER_COMPLETION,
    ActionName.TRACK_PATTERN,
    ActionName.COMPLETION_STATUS,
  ],
  [QueueName.INSTRUCTION]: [
    ActionName.PROCESS_INSTRUCTION_LINE,
    ActionName.SAVE_INSTRUCTION_LINE,
    ActionName.INSTRUCTION_COMPLETED_STATUS,
    ActionName.UPDATE_INSTRUCTION_COUNT,
    ActionName.COMPLETION_STATUS,
  ],
  [QueueName.IMAGE]: [
    ActionName.PROCESS_IMAGE,
    ActionName.SAVE_IMAGE,
    ActionName.IMAGE_COMPLETED_STATUS,
  ],
  [QueueName.CATEGORIZATION]: [
    ActionName.PROCESS_CATEGORIZATION,
    ActionName.SAVE_CATEGORIZATION,
    ActionName.CATEGORIZATION_COMPLETED_STATUS,
  ],
  [QueueName.SOURCE]: [
    ActionName.PROCESS_SOURCE,
    ActionName.SAVE_SOURCE,
    ActionName.SOURCE_PROCESSING_STATUS,
    ActionName.SOURCE_COMPLETED_STATUS,
    ActionName.BROADCAST_SOURCE_COMPLETED,
  ],
};

// Re-export commonly used types
export type {
  ParsedIngredientLine,
  ParsedInstructionLine,
  Note,
  NoteStatus,
  NoteStatusEvent,
  QueueJob,
  QueueJobStatus,
  QueueJobType,
  ErrorCode,
};

// Keep ParsedHTMLFile as it's specific to the parser output
export type ParsedHTMLFile = {
  title: string;
  historicalCreatedAt?: Date;
  contents: string;
  ingredients: ParsedIngredientLine[];
  instructions: ParsedInstructionLine[];
  source?: string;
  image?: string;
};

// Error handling types
export enum ErrorType {
  VALIDATION_ERROR = "VALIDATION_ERROR",
  DATABASE_ERROR = "DATABASE_ERROR",
  REDIS_ERROR = "REDIS_ERROR",
  PARSING_ERROR = "PARSING_ERROR",
  EXTERNAL_SERVICE_ERROR = "EXTERNAL_SERVICE_ERROR",
  NETWORK_ERROR = "NETWORK_ERROR",
  TIMEOUT_ERROR = "TIMEOUT_ERROR",
  WORKER_ERROR = "WORKER_ERROR",
  UNKNOWN_ERROR = "UNKNOWN_ERROR",
}

export enum ErrorSeverity {
  LOW = "LOW",
  MEDIUM = "MEDIUM",
  HIGH = "HIGH",
  CRITICAL = "CRITICAL",
}

export interface JobError {
  type: ErrorType;
  severity: ErrorSeverity;
  message: string;
  code?: string;
  context?: Record<string, unknown>;
  originalError?: Error;
  timestamp: Date;
  jobId?: string;
  queueName?: string;
  retryCount?: number;
}

export interface ValidationError extends JobError {
  type: ErrorType.VALIDATION_ERROR;
  field?: string;
  value?: unknown;
}

export interface DatabaseError extends JobError {
  type: ErrorType.DATABASE_ERROR;
  operation?: string;
  table?: string;
}

export interface RetryConfig {
  maxRetries: number;
  backoffMs: number;
  backoffMultiplier: number;
  maxBackoffMs: number;
}

// Health check types with discriminated unions
export interface ServiceHealth {
  status: "healthy" | "degraded" | "unhealthy";
  checks: {
    database: HealthCheck;
    redis: HealthCheck;
    queues: Record<string, HealthCheck>;
  };
  timestamp: Date;
}

// Base health check interface
interface BaseHealthCheck {
  message?: string;
  lastChecked: Date;
}

// Healthy status with performance metrics
export interface HealthyCheck extends BaseHealthCheck {
  status: "healthy";
  responseTime?: number;
  performance?: number; // 0-100 performance score
}

// Degraded status with warnings
export interface DegradedCheck extends BaseHealthCheck {
  status: "degraded";
  warnings: string[];
  performance: number; // 0-100 performance score
  responseTime?: number;
  retryAfter?: number; // seconds to wait before retry
}

// Unhealthy status with error details
export interface UnhealthyCheck extends BaseHealthCheck {
  status: "unhealthy";
  error: string;
  errorCode?: string;
  retryAfter?: number; // seconds to wait before retry
  critical?: boolean; // whether this is a critical failure
  responseTime?: number; // response time in milliseconds
}

// Union type for all health check states
export type HealthCheck = HealthyCheck | DegradedCheck | UnhealthyCheck;

// TypedQueue generic for BullMQ queues
export interface TypedQueue<JobData, Action extends string = string>
  extends Queue {
  add: (
    name: Action,
    data: JobData,
    opts?: Parameters<Queue["add"]>[2]
  ) => ReturnType<Queue["add"]>;
}

// ActionName type aliases for each queue
export type NoteActionName = (typeof QUEUE_ACTIONS)[QueueName.NOTES][number];
