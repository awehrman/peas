export type ParsedIngredientLine = {
  blockIndex: number;
  lineIndex: number;
  parseStatus?: "PENDING" | "CORRECT" | "INCORRECT" | "ERROR";
  parsedAt?: Date;
  reference: string;
  rule?: string;
};

export type ParsedInstructionLine = {
  parseStatus?: "PENDING" | "CORRECT" | "INCORRECT" | "ERROR";
  lineIndex: number;
  reference: string;
};

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
  note: any; // Note from database
}

export interface InstructionJobData {
  note: any; // Note from database
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
