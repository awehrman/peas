import { Worker, Queue, Job } from "bullmq";
import { redisConnection } from "../../config/redis";
import { BaseAction } from "../actions/core/base-action";
import { ActionContext } from "../actions/core/types";
import {
  ActionFactory,
  globalActionFactory,
} from "../actions/core/action-factory";
import {
  BroadcastProcessingAction,
  BroadcastCompletedAction,
} from "../shared/broadcast-status";
import { ErrorHandlingWrapperAction } from "../shared/error-handling";
import { RetryWrapperAction } from "../shared/retry";
import { globalActionCache, createCacheKey } from "./cache";
import { WorkerMetrics } from "./metrics";
import { ActionExecutionError } from "./errors";

export interface BaseWorkerDependencies {
  addStatusEventAndBroadcast: (event: {
    noteId: string;
    status: string;
    message: string;
    context: string;
  }) => Promise<void>;
  ErrorHandler: {
    withErrorHandling: <T>(
      operation: () => Promise<T>,
      context: { jobId: string; operation: string; noteId?: string }
    ) => Promise<T>;
  };
  logger: {
    log: (message: string, level?: string) => void;
  };
}

export interface BaseJobData {
  noteId?: string;
  [key: string]: any;
}

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

  constructor(
    queue: Queue,
    dependencies: TDeps,
    actionFactory?: ActionFactory
  ) {
    this.dependencies = dependencies;
    this.actionFactory = actionFactory || globalActionFactory;

    // Register actions if needed
    this.registerActions();

    // Create the worker
    this.worker = this.createWorker(queue);
  }

  /**
   * Abstract method to create the action pipeline for this worker
   */
  protected abstract createActionPipeline(
    data: TData,
    context: ActionContext
  ): BaseAction<any, any>[];

  /**
   * Abstract method to register worker-specific actions
   */
  protected abstract registerActions(): void;

  /**
   * Get the operation name for this worker
   */
  protected abstract getOperationName(): string;

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
      };

      const data = job.data as TData;

      try {
        // Create the action pipeline
        const actions = this.createActionPipeline(data, context);

        // Execute the pipeline
        let result = data;
        for (const action of actions) {
          const actionStartTime = Date.now();
          try {
            result = await this.executeActionWithCaching(
              action,
              result,
              context
            );
            const actionDuration = Date.now() - actionStartTime;
            WorkerMetrics.recordActionExecutionTime(
              action.name,
              actionDuration,
              true
            );
          } catch (error) {
            const actionDuration = Date.now() - actionStartTime;
            WorkerMetrics.recordActionExecutionTime(
              action.name,
              actionDuration,
              false
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
   * Add standard status broadcasting actions to the pipeline
   */
  protected addStatusActions(
    actions: BaseAction<any, any>[],
    data: TData
  ): void {
    // Only add status actions if we have a noteId
    if (data.noteId) {
      actions.unshift(new BroadcastProcessingAction());
      actions.push(new BroadcastCompletedAction());
    }
  }

  /**
   * Wrap an action with retry and error handling
   */
  protected wrapWithRetryAndErrorHandling(
    action: BaseAction<any, any>
  ): BaseAction<any, any> {
    const withRetry = new RetryWrapperAction(action);
    return new ErrorHandlingWrapperAction(withRetry);
  }

  /**
   * Wrap an action with just error handling (no retry)
   */
  protected wrapWithErrorHandling(
    action: BaseAction<any, any>
  ): BaseAction<any, any> {
    return new ErrorHandlingWrapperAction(action);
  }

  /**
   * Create an action from the factory and wrap it with retry and error handling
   */
  protected createWrappedAction(
    actionName: string,
    deps?: any
  ): BaseAction<any, any> {
    const action = this.actionFactory.create(actionName, deps) as BaseAction<
      any,
      any
    >;
    return this.wrapWithRetryAndErrorHandling(action);
  }

  /**
   * Create an action from the factory and wrap it with just error handling
   */
  protected createErrorHandledAction(
    actionName: string,
    deps?: any
  ): BaseAction<any, any> {
    const action = this.actionFactory.create(actionName, deps) as BaseAction<
      any,
      any
    >;
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
    action: BaseAction<any, any>,
    data: any,
    context: ActionContext
  ): Promise<any> {
    // Check if action supports caching
    if (action.name.includes("parse") || action.name.includes("fetch")) {
      const cacheKey = createCacheKey(
        "action",
        action.name,
        context.jobId,
        JSON.stringify(data)
      );

      const cached = globalActionCache.get(cacheKey);
      if (cached) {
        this.dependencies.logger.log(
          `Cache hit for action ${action.name} in job ${context.jobId}`
        );
        return cached;
      }

      const result = await action.execute(data, this.dependencies, context);
      globalActionCache.set(cacheKey, result, 300000); // Cache for 5 minutes
      return result;
    }

    // No caching for other actions
    return action.execute(data, this.dependencies, context);
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
