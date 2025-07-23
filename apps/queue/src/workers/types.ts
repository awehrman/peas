import { Queue } from "bullmq";

import type { IServiceContainer } from "../services/container";

import type { LogLevel } from "./core/types";

// ============================================================================
// BRANDED TYPES FOR IDENTIFIERS
// ============================================================================

/**
 * Branded type for job IDs to prevent mixing with other string types
 */
export type JobId = string & { readonly __brand: "JobId" };

/**
 * Branded type for note IDs to prevent mixing with other string types
 */
export type NoteId = string & { readonly __brand: "NoteId" };

/**
 * Branded type for user IDs to prevent mixing with other string types
 */
export type UserId = string & { readonly __brand: "UserId" };

/**
 * Branded type for import IDs to prevent mixing with other string types
 */
export type ImportId = string & { readonly __brand: "ImportId" };

/**
 * Branded type for action names to prevent mixing with other string types
 */
export type ActionName = string & { readonly __brand: "ActionName" };

/**
 * Branded type for queue names to prevent mixing with other string types
 */
export type QueueName = string & { readonly __brand: "QueueName" };

/**
 * Branded type for worker names to prevent mixing with other string types
 */
export type WorkerName = string & { readonly __brand: "WorkerName" };

// ============================================================================
// BRANDED TYPE UTILITIES
// ============================================================================

/**
 * Create a branded ID from a string
 */
export function createJobId(id: string): JobId {
  return id as JobId;
}

/**
 * Create a branded note ID from a string
 */
export function createNoteId(id: string): NoteId {
  return id as NoteId;
}

/**
 * Create a branded user ID from a string
 */
export function createUserId(id: string): UserId {
  return id as UserId;
}

/**
 * Create a branded import ID from a string
 */
export function createImportId(id: string): ImportId {
  return id as ImportId;
}

/**
 * Create a branded action name from a string
 */
export function createActionName(name: string): ActionName {
  return name as ActionName;
}

/**
 * Create a branded queue name from a string
 */
export function createQueueName(name: string): QueueName {
  return name as QueueName;
}

/**
 * Create a branded worker name from a string
 */
export function createWorkerName(name: string): WorkerName {
  return name as WorkerName;
}

// ============================================================================
// BASE TYPES
// ============================================================================

/**
 * Base interface for job data - all job data should extend this
 * Removed index signature for better type safety
 */
export interface BaseJobData {
  /** Unique identifier for the job */
  jobId?: JobId;
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

export interface StructuredLogger {
  log: (
    message: string,
    level?: LogLevel,
    meta?: Record<string, unknown>
  ) => void;
}

/**
 * Base interface for worker dependencies - all dependencies should extend this
 * Removed index signature for better type safety
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

/**
 * Represents a single action that can be performed by a worker
 */
export interface WorkerAction<
  TData = unknown,
  TDeps = unknown,
  TResult = unknown,
> {
  /** Unique identifier for this action */
  name: string;
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

/**
 * Context information available to all actions
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
 * Configuration for an action-based worker
 */
export interface ActionBasedWorkerConfig<TData = unknown, TDeps = unknown> {
  /** The BullMQ queue to process jobs from */
  queue: Queue;
  /** List of actions to execute in sequence */
  actions: WorkerAction<TData, TDeps>[];
  /** Dependencies to inject into actions */
  dependencies: TDeps;
  /** Maximum number of concurrent jobs */
  concurrency?: number;
  /** Name of the worker (for logging) */
  workerName: string;
  /** Custom data validation function */
  validateData?: (data: TData) => Error | null;
  /** Custom status update function */
  updateStatus?: (
    status: string,
    message: string,
    context: ActionContext
  ) => Promise<void>;
  /** Whether to check service health before processing */
  checkHealth?: boolean;
}

/**
 * Result of an action execution
 */
export interface ActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: Error;
  duration?: number; // Duration is now optional for flexibility
}

/**
 * Result of processing a job through the pipeline
 */
export interface JobProcessingResult {
  success: boolean;
  jobId: string;
  actions: ActionResult<unknown>[];
  totalDuration: number;
  error?: Error;
}

/**
 * Status information about a worker
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
 * Status event for tracking progress
 * Removed index signature for better type safety
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

/**
 * Action factory type for creating and managing actions
 * Removed index signature for better type safety
 */

// ============================================================================
// ACTION PIPELINE TYPES
// ============================================================================

/**
 * Generic action interface to avoid circular dependencies
 */
export interface BaseAction<
  TData = unknown,
  TDeps = unknown,
  TResult = unknown,
> {
  name: string;
  execute: (
    data: TData,
    deps: TDeps,
    context: ActionContext
  ) => Promise<TResult>;
  retryable?: boolean;
  priority?: number;
}

/**
 * Generic worker interface to avoid circular dependencies
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

/**
 * Generic action pipeline type that maintains type safety through the pipeline
 * TInput: Input type for the first action
 * TOutput: Output type of the last action
 * TIntermediate: Intermediate types (for complex pipelines)
 */
export type ActionPipeline<
  TInput,
  TOutput,
  TIntermediate = TInput,
> = BaseAction<TInput | TIntermediate, TOutput | TIntermediate>[];

/**
 * Generic action pipeline builder type with better type safety
 */
export type ActionPipelineBuilder<TInput, TOutput, TDeps = unknown> = (
  data: TInput,
  context: ActionContext,
  deps: TDeps
) => ActionPipeline<TInput, TOutput>;

/**
 * Type-safe action wrapper that preserves input/output types
 */
export type ActionWrapper<TInput, TOutput> = (
  action: BaseAction<TInput, TOutput>
) => BaseAction<TInput, TOutput>;

// ============================================================================
// WORKER PIPELINE TYPES
// ============================================================================

/**
 * Generic worker pipeline type with better type safety
 */
export type WorkerPipeline<TInput, TOutput, TDeps = unknown> = {
  /** Build the action pipeline */
  build: ActionPipelineBuilder<TInput, TOutput, TDeps>;
  /** Validate the pipeline configuration */
  validate?: (config: PipelineConfig<TDeps>) => Error | null;
};

/**
 * Generic pipeline step type with better type safety
 */
export type PipelineStep<TInput, TOutput, TDeps> =
  | BaseAction<TInput, TOutput>
  | ((deps: TDeps) => BaseAction<TInput, TOutput>)
  | string; // Action name for factory-based creation

/**
 * Generic pipeline configuration with validation
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
// DATABASE OPERATION RESULT TYPES
// ============================================================================

/**
 * Standard database operation result
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
// STATUS AND ERROR TYPES
// ============================================================================

/**
 * Status event for broadcasting job progress
 */

/**
 * Error context for error handling
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
// JOB DATA TYPES
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
  name: string;
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
// WORKER FACTORY TYPES
// ============================================================================

/**
 * Worker factory function type
 */
export type WorkerFactory = (
  queue: Queue,
  container: IServiceContainer
) => BaseWorker<BaseJobData, BaseWorkerDependencies>;

/**
 * Worker configuration options
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
 * Type utility to ensure required properties
 */
export type HasRequired<T, K extends keyof T> = T & Required<Pick<T, K>>;

/**
 * Type utility to make properties optional
 */
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

/**
 * Type utility to make properties required
 */
export type MakeRequired<T, K extends keyof T> = T & Required<Pick<T, K>>;

/**
 * Type utility for partial with required properties
 */
export type PartialWithRequired<T, K extends keyof T> = Partial<T> &
  Required<Pick<T, K>>;

/**
 * Type utility for union to intersection conversion
 */
export type UnionToIntersection<U> = (
  U extends unknown ? (k: U) => void : never
) extends (k: infer I) => void
  ? I
  : never;

/**
 * Type utility for function return type extraction
 */
export type ReturnType<T> = T extends (...args: unknown[]) => infer R
  ? R
  : never;
