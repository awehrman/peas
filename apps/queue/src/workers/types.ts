import { Queue } from "bullmq";

import type { IServiceContainer } from "../services/container";
import type { ActionName, LogLevel } from "../types";

// ============================================================================
// CORE WORKER TYPES
// ============================================================================

/**
 * Base job data interface that all jobs extend
 */
export interface BaseJobData {
  /** Unique identifier for the job */
  jobId?: string;
  /** Job metadata for additional context */
  metadata?: Record<string, unknown>;
  /** When the job was created */
  createdAt?: Date;
  /** Job priority (lower numbers = higher priority) */
  priority?: number;
  /** Job timeout in milliseconds */
  timeout?: number;
  /** Job retry configuration */
  retry?: {
    attempts: number;
    backoff: number;
    delay: number;
  };
  /** Job tags for categorization */
  tags?: string[];
}

/**
 * Structured logger interface for consistent logging
 */
export interface StructuredLogger {
  log: (
    message: string,
    level?: LogLevel,
    meta?: Record<string, unknown>
  ) => void;
}

/**
 * Base dependencies that all workers have access to
 */
export interface BaseWorkerDependencies {
  /** Structured logger for all logging */
  logger: StructuredLogger;
  /** Error handling utilities */
  errorHandler?: {
    withErrorHandling: <T>(
      operation: () => Promise<T>,
      context: Record<string, unknown>
    ) => Promise<T>;
    createJobError: (
      error: Error,
      context: Record<string, unknown>
    ) => Record<string, unknown>;
    classifyError: (error: Error) => string;
    logError: (error: Error, context: Record<string, unknown>) => void;
  };
  /** Status broadcasting utilities */
  statusBroadcaster?: {
    addStatusEventAndBroadcast: (
      event: Record<string, unknown>
    ) => Promise<Record<string, unknown>>;
  };
  /** Queue references for cross-worker communication */
  queues?: {
    noteQueue?: Queue;
    imageQueue?: Queue;
    ingredientQueue?: Queue;
    instructionQueue?: Queue;
    categorizationQueue?: Queue;
    sourceQueue?: Queue;
  };
}

// ============================================================================
// ACTION TYPES
// ============================================================================

/**
 * Context information passed to actions during execution
 */
export interface ActionContext {
  jobId: string;
  retryCount: number;
  queueName: string;
  noteId?: string;
  operation: string;
  startTime: number;
  workerName: string;
  attemptNumber: number;
}

/**
 * Result of an action execution
 */
export interface ActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: Error;
  duration?: number;
}

/**
 * Core action interface that all actions implement
 */
export interface WorkerAction<
  TData = unknown,
  TDeps = unknown,
  TResult = unknown,
> {
  /** Unique identifier for this action */
  name: ActionName;
  /** Function that performs the action */
  execute: (
    data: TData,
    deps: TDeps,
    context: ActionContext
  ) => Promise<TResult>;
  /** Whether this action should be retried on failure */
  retryable?: boolean;
  /** Custom error handling for this action */
  onError?: (
    error: Error,
    data: TData,
    deps: TDeps,
    context: ActionContext
  ) => Promise<void>;
  /** Priority of this action (lower numbers = higher priority) */
  priority?: number;
  /** Execute the action with timing and error handling */
  executeWithTiming: (
    data: TData,
    deps: TDeps,
    context: ActionContext
  ) => Promise<ActionResult<TResult>>;
  /** Create a new action instance with custom configuration */
  withConfig?: (
    config: Partial<
      Pick<WorkerAction<TData, TDeps, TResult>, "retryable" | "priority">
    >
  ) => WorkerAction<TData, TDeps, TResult>;
}

// ============================================================================
// WORKER TYPES
// ============================================================================

/**
 * Result of processing a job
 */
export interface JobProcessingResult {
  success: boolean;
  jobId: string;
  actions: ActionResult<unknown>[];
  totalDuration: number;
  error?: Error;
}

/**
 * Worker status information
 */
export interface WorkerStatus {
  name: string;
  isRunning: boolean;
  processedJobs: number;
  failedJobs: number;
  lastJobTime?: Date;
  uptime: number;
}

/**
 * Status event for broadcasting updates
 */
export interface StatusEvent {
  /** Event type for categorization */
  type: string;
  /** Event message */
  message: string;
  /** Event timestamp */
  timestamp: Date;
  /** Event severity level */
  severity: "info" | "warn" | "error" | "critical";
  /** Event metadata */
  metadata?: Record<string, unknown>;
  /** Related job ID */
  jobId?: string;
  /** Related note ID */
  noteId?: string;
  /** Event context */
  context?: Record<string, unknown>;
}

// ============================================================================
// BASE CLASSES
// ============================================================================

/**
 * Base action interface for inheritance
 */
export interface BaseAction<
  TData = unknown,
  TDeps = unknown,
  TResult = unknown,
> {
  name: ActionName;
  execute: (
    data: TData,
    deps: TDeps,
    context: ActionContext
  ) => Promise<TResult>;
  retryable?: boolean;
  priority?: number;
  executeWithTiming: (
    data: TData,
    deps: TDeps,
    context: ActionContext
  ) => Promise<ActionResult<TResult>>;
  onError?: (
    error: Error,
    data: TData,
    deps: TDeps,
    context: ActionContext
  ) => Promise<void>;
  withConfig?: (
    config: Partial<
      Pick<WorkerAction<TData, TDeps, TResult>, "retryable" | "priority">
    >
  ) => WorkerAction<TData, TDeps, TResult>;
}

/**
 * Base worker interface
 */
export interface BaseWorker<
  TData = unknown,
  TDeps = unknown,
  TResult = unknown,
> {
  getStatus(): { isRunning: boolean; name: string };
  // Type parameters are used for type safety in implementations
  _dataType?: TData;
  _depsType?: TDeps;
  _resultType?: TResult;
}

// ============================================================================
// PIPELINE TYPES
// ============================================================================

/**
 * Action pipeline type
 */
export type ActionPipeline<
  TInput,
  TOutput,
  TIntermediate = TInput,
> = BaseAction<TInput | TIntermediate, TOutput | TIntermediate>[];

/**
 * Pipeline builder function type
 */
export type ActionPipelineBuilder<TInput, TOutput, TDeps = unknown> = (
  data: TInput,
  context: ActionContext,
  deps: TDeps
) => ActionPipeline<TInput, TOutput>;

/**
 * Action wrapper function type
 */
export type ActionWrapper<TInput, TOutput> = (
  action: BaseAction<TInput, TOutput>
) => BaseAction<TInput, TOutput>;

/**
 * Worker pipeline configuration
 */
export type WorkerPipeline<TInput, TOutput, TDeps = unknown> = {
  /** Build the action pipeline */
  build: ActionPipelineBuilder<TInput, TOutput, TDeps>;
  /** Validate the pipeline configuration */
  validate?: (config: PipelineConfig<TDeps>) => Error | null;
};

/**
 * Pipeline step can be an action, action factory, or action name
 */
export type PipelineStep<TInput, TOutput, TDeps> =
  | BaseAction<TInput, TOutput>
  | ((deps: TDeps) => BaseAction<TInput, TOutput>)
  | ActionName;

/**
 * Pipeline configuration
 */
export interface PipelineConfig<TDeps = unknown> {
  /** Pipeline steps */
  steps: PipelineStep<unknown, unknown, TDeps>[];
  /** Whether to add status actions */
  addStatusActions?: boolean;
  /** Whether to wrap actions with retry logic */
  useRetry?: boolean;
  /** Whether to wrap actions with error handling */
  useErrorHandling?: boolean;
  /** Custom action wrapper */
  customWrapper?: ActionWrapper<unknown, unknown>;
  /** Pipeline validation */
  validation?: {
    input?: (data: unknown) => Error | null;
    output?: (result: unknown) => Error | null;
  };
}

// ============================================================================
// DATABASE TYPES
// ============================================================================

/**
 * Database operation result
 */
export interface DatabaseOperationResult {
  success: boolean;
  id?: string;
  count?: number;
  error?: string;
}

/**
 * Database update result
 */
export interface DatabaseUpdateResult extends DatabaseOperationResult {
  updatedAt: Date;
  affectedRows?: number;
}

/**
 * Database create result
 */
export interface DatabaseCreateResult extends DatabaseOperationResult {
  id: string;
  createdAt: Date;
}

// ============================================================================
// ERROR TYPES
// ============================================================================

/**
 * Error context for better error handling
 */
export interface ErrorContext extends Record<string, unknown> {
  jobId?: string;
  operation?: string;
  noteId?: string;
  workerName?: string;
  attemptNumber?: number;
  [key: string]: unknown;
}

// ============================================================================
// ACTION INPUT/OUTPUT TYPES
// ============================================================================

/**
 * Action input wrapper
 */
export interface ActionInput<TData = unknown> {
  data: TData;
  context: ActionContext;
}

/**
 * Action output wrapper
 */
export interface ActionOutput<TResult = unknown> {
  success: boolean;
  result?: TResult;
  error?: Error;
  metadata?: Record<string, unknown>;
  duration?: number;
}

/**
 * Typed action interface
 */
export interface TypedAction<TInput, TOutput, TDeps = unknown> {
  name: ActionName;
  execute: (
    input: TInput,
    deps: TDeps,
    context: ActionContext
  ) => Promise<TOutput>;
  validate?: (input: TInput) => Error | null;
  retryable?: boolean;
  priority?: number;
  timeout?: number;
}

// ============================================================================
// FACTORY TYPES
// ============================================================================

/**
 * Worker factory function type
 */
export type WorkerFactory = (
  queue: Queue,
  container: IServiceContainer
) => BaseWorker<BaseJobData, BaseWorkerDependencies>;

/**
 * Worker configuration
 */
export interface WorkerConfig {
  concurrency?: number;
  retryAttempts?: number;
  backoffMs?: number;
  maxBackoffMs?: number;
  timeoutMs?: number;
  healthCheckInterval?: number;
  gracefulShutdownTimeout?: number;
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

/**
 * Make specific properties required
 */
export type HasRequired<T, K extends keyof T> = T & Required<Pick<T, K>>;

/**
 * Make specific properties optional
 */
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

/**
 * Make specific properties required
 */
export type MakeRequired<T, K extends keyof T> = T & Required<Pick<T, K>>;

/**
 * Partial type with specific required properties
 */
export type PartialWithRequired<T, K extends keyof T> = Partial<T> &
  Required<Pick<T, K>>;

/**
 * Union to intersection type utility
 */
export type UnionToIntersection<U> = (
  U extends unknown ? (k: U) => void : never
) extends (k: infer I) => void
  ? I
  : never;

/**
 * Return type utility
 */
export type ReturnType<T> = T extends (...args: unknown[]) => infer R
  ? R
  : never;
