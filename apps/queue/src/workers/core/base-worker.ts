import { Worker, Queue, Job } from "bullmq";
import { redisConnection } from "../../config/redis";
import { BaseAction } from "../core/base-action";

import { ActionFactory, globalActionFactory } from "../core/action-factory";
import {
  BroadcastProcessingAction,
  BroadcastCompletedAction,
} from "../shared/broadcast-status";
import { ErrorHandlingWrapperAction } from "../shared/error-handling";
import { RetryWrapperAction } from "../shared/retry";
import { globalActionCache, createCacheKey } from "./cache";
import { WorkerMetrics } from "./metrics";
import { ActionExecutionError } from "./errors";
import type {
  BaseWorkerDependencies,
  BaseJobData,
  ActionContext,
} from "../types";
import type { IServiceContainer } from "../../services/container";
import type { NoteStatus } from "@peas/database";

/**
 * Base worker class that provides common functionality for all workers
 */
export abstract class BaseWorker<
  TData extends BaseJobData = BaseJobData,
  TDeps extends BaseWorkerDependencies = BaseWorkerDependencies,
> {
  protected worker: Worker;
  protected actionFactory: ActionFactory;
  protected dependencies: TDeps;
  protected container?: IServiceContainer;

  constructor(
    queue: Queue,
    dependencies: TDeps,
    actionFactory?: ActionFactory,
    container?: IServiceContainer
  ) {
    this.dependencies = dependencies;
    this.actionFactory = actionFactory || globalActionFactory;
    this.container = container;

    this.registerActions();
    this.worker = this.createWorker(queue);
  }

  /**
   * Create a typed action pipeline for this worker
   * This method provides better type safety and should be overridden by subclasses
   */
  protected createActionPipeline(
    _data: TData,
    _context: ActionContext
  ): BaseAction<unknown, unknown>[] {
    // Default implementation returns empty array
    // Subclasses should override this method for better type safety
    return [];
  }

  /**
   * Abstract method to register worker-specific actions
   */
  protected abstract registerActions(): void;

  /**
   * Get the operation name for this worker
   */
  protected abstract getOperationName(): string;

  /**
   * Validate that required dependencies are available
   */
  public validateDependencies(): void {
    // Subclasses can override to add specific validations
  }

  /**
   * Create standard status broadcasting dependency
   */
  protected createStatusBroadcaster() {
    if (!this.container) {
      throw new Error("Container not available for status broadcaster");
    }

    return async (event: {
      importId: string;
      noteId?: string;
      status: NoteStatus;
      message?: string;
      context?: string;
      currentCount?: number;
      totalCount?: number;
      indentLevel?: number;
    }) => {
      if (this.container?.statusBroadcaster?.addStatusEventAndBroadcast) {
        return this.container.statusBroadcaster.addStatusEventAndBroadcast(
          event
        );
      } else {
        return Promise.resolve();
      }
    };
  }

  /**
   * Create standard error handler dependency
   */
  protected createErrorHandler() {
    if (!this.container) {
      throw new Error("Container not available for error handler");
    }

    return (
      this.container.errorHandler?.errorHandler || {
        withErrorHandling: async (operation) => operation(),
      }
    );
  }

  /**
   * Create standard logger dependency
   */
  protected createLogger() {
    if (!this.container) {
      throw new Error("Container not available for logger");
    }

    return this.container.logger;
  }

  /**
   * Create base dependencies that all workers need
   */
  public createBaseDependencies() {
    return {
      addStatusEventAndBroadcast: this.createStatusBroadcaster(),
      ErrorHandler: this.createErrorHandler(),
      logger: this.createLogger(),
    };
  }

  /**
   * Create the BullMQ worker with action-based job processing
   */
  private createWorker(queue: Queue): Worker {
    const jobProcessor = async (job: Job) => {
      const startTime = Date.now();
      const context: ActionContext = {
        jobId: job.id ?? "unknown",
        retryCount: job.attemptsMade,
        queueName: queue.name,
        noteId: (job.data as TData).noteId,
        operation: this.getOperationName(),
        startTime,
        workerName: this.getOperationName(),
        attemptNumber: job.attemptsMade + 1,
      };

      const data = job.data as TData;

      this.dependencies.logger.log(
        `[${this.getOperationName().toUpperCase()}] Starting job ${context.jobId}`
      );

      try {
        // Create the action pipeline
        const actions = this.createActionPipeline(data, context);

        // Execute the pipeline
        let result: TData = data;
        const actionNames = actions.map((a) => {
          // Extract the actual action name from wrapper names
          if (a.name.includes("error_handling_wrapper(")) {
            return a.name
              .replace("error_handling_wrapper(", "")
              .replace(")", "");
          }
          if (a.name.includes("retry_wrapper(")) {
            return a.name.replace("retry_wrapper(", "").replace(")", "");
          }
          return a.name;
        });
        this.dependencies.logger.log(
          `[${this.getOperationName().toUpperCase()}] Executing ${actions.length} actions: ${actionNames.join(", ")}`
        );
        for (const action of actions) {
          const actionStartTime = Date.now();
          // Extract clean action name for logging
          let cleanActionName = action.name;
          if (action.name.includes("error_handling_wrapper(")) {
            cleanActionName = action.name
              .replace("error_handling_wrapper(", "")
              .replace(")", "");
          }
          if (action.name.includes("retry_wrapper(")) {
            cleanActionName = action.name
              .replace("retry_wrapper(", "")
              .replace(")", "");
          }

          this.dependencies.logger.log(
            `[${this.getOperationName().toUpperCase()}] Data for action ${cleanActionName}: ${this.truncateResultForLogging(result)}`
          );
          try {
            result = (await this.executeActionWithCaching(
              action,
              result,
              context
            )) as TData;
            const actionDuration = Date.now() - actionStartTime;
            WorkerMetrics.recordActionExecutionTime(
              action.name,
              actionDuration,
              true
            );
            this.dependencies.logger.log(
              `[${this.getOperationName().toUpperCase()}] ✅ ${cleanActionName} (${actionDuration}ms)`
            );
          } catch (error) {
            const actionDuration = Date.now() - actionStartTime;
            WorkerMetrics.recordActionExecutionTime(
              action.name,
              actionDuration,
              false
            );
            this.dependencies.logger.log(
              `[${this.getOperationName().toUpperCase()}] ❌ ${cleanActionName} (${actionDuration}ms) - ${(error as Error).message}`,
              "error"
            );
            throw new ActionExecutionError(
              `Action ${action.name} failed: ${(error as Error).message}`,
              this.getOperationName(),
              action.name,
              error as Error,
              context.jobId
            );
          }
        }

        const totalDuration = Date.now() - startTime;
        WorkerMetrics.recordJobProcessingTime(
          this.getOperationName(),
          totalDuration,
          true
        );

        this.dependencies.logger.log(
          `${this.getOperationName()} completed for job ${context.jobId} in ${totalDuration}ms`
        );
        return result;
      } catch (error) {
        const totalDuration = Date.now() - startTime;
        WorkerMetrics.recordJobProcessingTime(
          this.getOperationName(),
          totalDuration,
          false
        );

        this.dependencies.logger.log(
          `${this.getOperationName()} failed for job ${context.jobId}: ${error}`,
          "error"
        );
        throw error;
      }
    };

    return new Worker(queue.name, jobProcessor, {
      connection: redisConnection,
      concurrency: this.getConcurrency(),
    });
  }

  /**
   * Get the concurrency level for this worker (can be overridden)
   */
  protected getConcurrency(): number {
    return 5;
  }

  /**
   * Truncate result data for logging to prevent overly long log messages
   */
  private truncateResultForLogging(result: unknown): string {
    const truncate = (str: string) =>
      str.length > 25 ? str.slice(0, 25) + "..." : str;

    try {
      const jsonStr = JSON.stringify(result);
      if (jsonStr.length <= 100) {
        return jsonStr;
      }

      // For longer results, truncate individual string values
      const truncated = JSON.stringify(result, (key, value) => {
        if (typeof value === "string" && value.length > 25) {
          return truncate(value);
        }
        return value;
      });

      return truncated.length > 200 ? truncate(truncated) : truncated;
    } catch {
      return `[Object - ${typeof result}]`;
    }
  }

  /**
   * Add standard status broadcasting actions to the pipeline
   */
  protected addStatusActions(
    actions: BaseAction<unknown, unknown>[],
    data: TData
  ): void {
    this.dependencies.logger.log(
      `[${this.getOperationName().toUpperCase()}] addStatusActions called with data: noteId=${data.noteId}, hasNoteId=${!!data.noteId}, dataKeys=${Object.keys(data).join(", ")}`
    );

    // Add status actions regardless of noteId - they will handle missing noteId gracefully
    this.dependencies.logger.log(
      `[${this.getOperationName().toUpperCase()}] Adding status actions`
    );
    actions.unshift(new BroadcastProcessingAction());
    actions.push(new BroadcastCompletedAction());
  }

  /**
   * Wrap an action with retry and error handling
   */
  protected wrapWithRetryAndErrorHandling<TInput, TOutput>(
    action: BaseAction<TInput, TOutput>
  ): BaseAction<TInput, TOutput> {
    const withRetry = new RetryWrapperAction(action);
    return new ErrorHandlingWrapperAction(withRetry) as BaseAction<
      TInput,
      TOutput
    >;
  }

  /**
   * Wrap an action with just error handling (no retry)
   */
  protected wrapWithErrorHandling<TInput, TOutput>(
    action: BaseAction<TInput, TOutput>
  ): BaseAction<TInput, TOutput> {
    return new ErrorHandlingWrapperAction(action) as BaseAction<
      TInput,
      TOutput
    >;
  }

  /**
   * Create an action from the factory and wrap it with retry and error handling
   */
  protected createWrappedAction(
    actionName: string,
    deps?: TDeps
  ): BaseAction<TData, TData> {
    const action = this.actionFactory.create(
      actionName,
      deps
    ) as unknown as BaseAction<TData, TData>;
    return this.wrapWithRetryAndErrorHandling(action);
  }

  /**
   * Create an action from the factory and wrap it with just error handling
   */
  protected createErrorHandledAction(
    actionName: string,
    deps?: TDeps
  ): BaseAction<TData, TData> {
    const action = this.actionFactory.create(
      actionName,
      deps
    ) as unknown as BaseAction<TData, TData>;
    return this.wrapWithErrorHandling(action);
  }

  /**
   * Close the worker
   */
  async close(): Promise<void> {
    await this.worker.close();
  }

  /**
   * Get the underlying BullMQ worker
   */
  getWorker(): Worker {
    return this.worker;
  }

  /**
   * Execute an action with caching support
   */
  private async executeActionWithCaching(
    action: BaseAction<unknown, unknown>,
    data: unknown,
    context: ActionContext
  ): Promise<unknown> {
    // Check if action supports caching
    if (action.name.includes("parse") || action.name.includes("fetch")) {
      const cacheKey = createCacheKey(
        "action",
        action.name,
        context.jobId,
        JSON.stringify(data)
      );

      const cached = globalActionCache.get<unknown>(cacheKey);
      if (cached) {
        this.dependencies.logger.log(
          `Cache hit for action ${action.name} in job ${context.jobId}`
        );
        return cached;
      }

      const result = await action.execute(
        data,
        this.dependencies as unknown,
        context
      );
      globalActionCache.set(cacheKey, result, 300000); // Cache for 5 minutes
      return result;
    }

    // No caching for other actions
    const result = await action.execute(
      data,
      this.dependencies as unknown,
      context
    );
    return result;
  }

  /**
   * Get worker status information
   */
  getStatus(): { isRunning: boolean; name: string } {
    const status = {
      isRunning: this.worker.isRunning(),
      name: this.getOperationName(),
    };

    // Record worker status metric
    WorkerMetrics.recordWorkerStatus(this.getOperationName(), status.isRunning);

    return status;
  }
}

/**
 * Static helper to create base dependencies from a container
 */
export function createBaseDependenciesFromContainer(
  container: IServiceContainer
) {
  return {
    addStatusEventAndBroadcast: async (event: {
      importId: string;
      noteId?: string;
      status: NoteStatus;
      message?: string;
      context?: string;
      currentCount?: number;
      totalCount?: number;
      indentLevel?: number;
    }) => {
      if (container.statusBroadcaster?.addStatusEventAndBroadcast) {
        return container.statusBroadcaster.addStatusEventAndBroadcast(event);
      } else {
        return Promise.resolve();
      }
    },
    ErrorHandler: container.errorHandler?.errorHandler || {
      withErrorHandling: async (operation) => operation(),
    },
    logger: container.logger,
  };
}
