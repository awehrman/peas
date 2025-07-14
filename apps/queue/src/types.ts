// Import Prisma types for better type safety
import type {
  ParsedIngredientLine,
  ParsedInstructionLine,
  Note,
  NoteStatus,
  NoteStatusEvent,
  QueueJob,
  QueueJobStatus,
  QueueJobType,
  ErrorCode,
} from "@peas/database";

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
  sourceUrl?: string;
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
  context?: Record<string, any>;
  originalError?: Error;
  timestamp: Date;
  jobId?: string;
  queueName?: string;
  retryCount?: number;
}

export interface ValidationError extends JobError {
  type: ErrorType.VALIDATION_ERROR;
  field?: string;
  value?: any;
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

// Job data validation interfaces
export interface NoteJobData {
  content: string;
}

export interface ImageJobData {
  noteId: string;
  file: ParsedHTMLFile;
}

export interface IngredientJobData {
  note: Note; // Use Prisma Note type
}

export interface InstructionJobData {
  note: Note; // Use Prisma Note type
}

export interface CategorizationJobData {
  noteId: string;
  file: ParsedHTMLFile;
}

// Health check types
export interface ServiceHealth {
  status: "healthy" | "degraded" | "unhealthy";
  checks: {
    database: HealthCheck;
    redis: HealthCheck;
    queues: Record<string, HealthCheck>;
  };
  timestamp: Date;
}

export interface HealthCheck {
  status: "healthy" | "degraded" | "unhealthy";
  message?: string;
  responseTime?: number;
  lastChecked: Date;
}
