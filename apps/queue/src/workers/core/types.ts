import { Queue } from "bullmq";

/**
 * Represents a single action that can be performed by a worker
 */
export interface WorkerAction<TData = any, TDeps = any> {
  /** Unique identifier for this action */
  name: string;
  /** Function that performs the action */
  execute: (data: TData, deps: TDeps, context: ActionContext) => Promise<any>;
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
  executeWithTiming?: (
    data: TData,
    deps: TDeps,
    context: ActionContext
  ) => Promise<ActionResult>;
  /** Create a new action instance with custom configuration */
  withConfig?: (
    config: Partial<Pick<WorkerAction, "retryable" | "priority">>
  ) => WorkerAction<TData, TDeps>;
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
export interface ActionBasedWorkerConfig<TData = any, TDeps = any> {
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
  /** Whether to validate job data before processing */
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
export interface ActionResult<T = any> {
  success: boolean;
  data?: T;
  error?: Error;
  duration: number;
}

/**
 * Job processing result
 */
export interface JobProcessingResult {
  success: boolean;
  jobId: string;
  actions: ActionResult[];
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
