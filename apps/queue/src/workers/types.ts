import { Queue } from "bullmq";
import type { IServiceContainer } from "../services/container";
import type { BaseWorker } from "./core/base-worker";
import type { BaseAction } from "./core/base-action";
import type { ActionContext as CoreActionContext } from "./core/types";
import type { NoteStatus } from "@peas/database";

// ============================================================================
// UNIFIED ACTION CONTEXT
// ============================================================================

/**
 * Extended ActionContext that includes worker-specific fields
 * This extends the core ActionContext from core/types.ts
 */
export type ActionContext = CoreActionContext;

// ============================================================================
// ACTION PIPELINE TYPES
// ============================================================================

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

/**
 * Generic action factory type with better type constraints
 */
export type ActionFactory<TDeps = unknown> = {
  create<TInput, TOutput>(
    actionName: string,
    deps?: TDeps
  ): BaseAction<TInput, TOutput>;
  register<TInput, TOutput>(
    actionName: string,
    factory: (deps?: TDeps) => BaseAction<TInput, TOutput>
  ): void;
  isRegistered(name: string): boolean;
  list(): string[];
};

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
// CORE WORKER TYPES
// ============================================================================

/**
 * Base dependencies that all workers require
 */
export interface BaseWorkerDependencies {
  /** Status broadcasting function */
  addStatusEventAndBroadcast: (event: StatusEvent) => Promise<unknown>;
  /** Error handling utilities */
  ErrorHandler: {
    withErrorHandling: <T>(
      operation: () => Promise<T>,
      context: ErrorContext
    ) => Promise<T>;
  };
  /** Logging interface */
  logger: {
    log: (message: string, level?: LogLevel) => void;
  };
}

/**
 * Status event type for better type safety
 */
export interface StatusEvent {
  noteId: string;
  status: NoteStatus;
  message?: string;
  context?: string;
  currentCount?: number;
  totalCount?: number;
  metadata?: Record<string, unknown>;
}

/**
 * Error context type for better type safety
 */
export interface ErrorContext {
  jobId: string;
  operation: string;
  noteId?: string;
  workerName?: string;
  attemptNumber?: number;
}

/**
 * Log level type for better type safety
 */
export type LogLevel = "debug" | "info" | "warn" | "error" | "fatal";

/**
 * Base job data that all jobs should include
 */
export interface BaseJobData {
  /** Optional note ID for status tracking */
  noteId?: string;
  /** Job metadata */
  metadata?: Record<string, unknown>;
  /** Job creation timestamp */
  createdAt?: Date;
  /** Job priority */
  priority?: number;
  /** Job timeout in milliseconds */
  timeout?: number;
}

// ============================================================================
// ACTION TYPES
// ============================================================================

export interface ActionInput<TData = unknown> {
  data: TData;
  context: ActionContext;
}

export interface ActionOutput<TResult = unknown> {
  success: boolean;
  result?: TResult;
  error?: Error;
  metadata?: Record<string, unknown>;
  duration?: number;
}

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
// FACTORY AND CONFIG TYPES
// ============================================================================

export type WorkerFactory = (
  queue: Queue,
  container: IServiceContainer
) => BaseWorker<BaseJobData, BaseWorkerDependencies>;

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

export type HasRequired<T, K extends keyof T> = T & Required<Pick<T, K>>;

export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export type MakeRequired<T, K extends keyof T> = T & Required<Pick<T, K>>;

/**
 * Type helper for creating partial types with required fields
 */
export type PartialWithRequired<T, K extends keyof T> = Partial<T> &
  Required<Pick<T, K>>;

/**
 * Type helper for creating union types with better type safety
 */
export type UnionToIntersection<U> = (
  U extends unknown ? (k: U) => void : never
) extends (k: infer I) => void
  ? I
  : never;

/**
 * Type helper for extracting the return type of a function
 */
export type ReturnType<T> = T extends (...args: unknown[]) => infer R
  ? R
  : never;
