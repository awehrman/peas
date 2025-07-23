import { ActionFactory } from "./action-factory";
import {
  wrapActionWithErrorHandlingOnly,
  wrapActionWithRetryAndErrorHandling,
} from "./action-wrappers";
import { BaseAction } from "./base-action";
import { processJob } from "./job-processor";
import { WorkerMetrics } from "./metrics";
import { injectStandardStatusActions } from "./status-actions";
import type { ActionContext, WorkerAction } from "./types";
import {
  buildErrorHandlerDependency,
  buildLoggerDependency,
  buildStatusBroadcasterDependency,
} from "./worker-dependencies";

import type { IServiceContainer } from "../../services/container";
import { LogLevel } from "../../types";
import type { ActionName } from "../../types";
import type { BaseJobData } from "../../workers/types";

// BullMQ abstraction interfaces for testability
export interface IQueue {
  name: string;
}

export interface IWorker {
  isRunning(): boolean;
}

// Type constraints for worker dependencies
interface WorkerLogger {
  log: (
    message: string,
    level?: LogLevel | undefined,
    meta?: Record<string, unknown>
  ) => void;
}

// Remove WorkerData interface and use BaseJobData instead

// Improved type aliases for better readability
type DefaultDeps = { logger: WorkerLogger };

type WorkerJob<T> = {
  id?: string;
  attemptsMade?: number;
  data: T;
};

type JobProcessor<TData> = (
  job: WorkerJob<TData>
) => Promise<Record<string, unknown>>;

type WorkerImpl<TData> = (
  queue: IQueue,
  jobProcessor: JobProcessor<TData>,
  concurrency: number
) => IWorker;

type WorkerAct<T, D, R> = WorkerAction<T, D, R>;
type ActionFact<T, D, R> = ActionFactory<T, D, R>;

// Worker configuration interface
interface WorkerConfig {
  concurrency: number;
}

/**
 * Base worker class that provides common functionality for all workers
 */
export abstract class BaseWorker<
  TData extends BaseJobData = BaseJobData,
  TDeps extends DefaultDeps = DefaultDeps,
  TResult = unknown,
> {
  protected worker!: IWorker;
  protected actionFactory: ActionFact<TData, TDeps, TResult>;
  protected dependencies: TDeps;
  protected container?: IServiceContainer;
  protected config: Partial<WorkerConfig> = {};

  /**
   * @param queue The queue to process jobs from (BullMQ Queue or compatible interface)
   * @param dependencies Worker dependencies (logger, status broadcaster, etc.)
   * @param actionFactory Optional action factory for creating actions
   * @param container Optional service container for dependency injection
   * @param config Optional configuration (e.g., concurrency)
   * @param workerImpl Optional custom worker implementation for testability
   */
  constructor(
    queue: IQueue,
    dependencies: TDeps,
    actionFactory?: ActionFact<TData, TDeps, TResult>,
    container?: IServiceContainer,
    config?: Partial<WorkerConfig>,
    workerImpl?: WorkerImpl<TData>
  ) {
    this.dependencies = dependencies;
    this.actionFactory =
      actionFactory || new ActionFactory<TData, TDeps, TResult>();
    this.container = container;
    if (config) this.config = config;
    this.registerActions();
    // Initialize worker asynchronously
    this.createWorker(queue, workerImpl).then((worker) => {
      this.worker = worker;
    });
  }

  /**
   * Lifecycle hook: called before job processing starts
   */
  protected async onBeforeJob(
    _data: TData,
    _context: ActionContext
  ): Promise<void> {}

  /**
   * Lifecycle hook: called after job processing completes
   */
  protected async onAfterJob(
    _data: TData,
    _context: ActionContext,
    _result: TResult
  ): Promise<void> {}

  /**
   * Lifecycle hook: called if job processing throws
   */
  protected async onJobError(
    _error: Error,
    _data: TData,
    _context: ActionContext
  ): Promise<void> {}

  /**
   * Create a typed action pipeline for this worker
   * This method provides better type safety and should be overridden by subclasses
   */
  protected createActionPipeline(
    _data: TData,
    _context: ActionContext
  ): WorkerAct<TData, TDeps, TResult>[] {
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
   * Inject standard status actions into the pipeline
   */
  protected injectStandardStatusActions(
    actions: WorkerAct<TData, TDeps, TResult>[],
    _data: TData
  ): void {
    injectStandardStatusActions(
      actions as BaseAction<TData, TDeps, TResult | void>[],
      this.getOperationName.bind(this),
      this.dependencies.logger
    );
  }

  /**
   * Create an action from the factory and wrap it with retry and error handling
   */
  protected createRetryableErrorHandledAction(
    actionName: ActionName,
    deps: TDeps = this.dependencies
  ): WorkerAct<TData, TDeps, TResult> {
    const action = this.actionFactory.create(actionName, deps);
    return wrapActionWithRetryAndErrorHandling(
      action as BaseAction<TData, TDeps>
    ) as WorkerAct<TData, TDeps, TResult>;
  }

  /**
   * Create an action from the factory and wrap it with just error handling
   */
  protected createErrorHandledActionOnly(
    actionName: ActionName,
    deps: TDeps = this.dependencies
  ): WorkerAct<TData, TDeps, TResult> {
    const action = this.actionFactory.create(actionName, deps);
    return wrapActionWithErrorHandlingOnly(
      action as BaseAction<TData, TDeps>
    ) as WorkerAct<TData, TDeps, TResult>;
  }

  /**
   * Create base dependencies that all workers need
   */
  public buildBaseWorkerDependencies() {
    return {
      addStatusEventAndBroadcast: buildStatusBroadcasterDependency(
        this.container!
      ),
      ErrorHandler: buildErrorHandlerDependency(this.container!),
      logger: buildLoggerDependency(this.container!),
    };
  }

  /**
   * Create the worker with action-based job processing. Allows custom worker implementation for testability.
   */
  private async createWorker(
    queue: IQueue,
    workerImpl?: WorkerImpl<TData>
  ): Promise<IWorker> {
    const jobProcessor: JobProcessor<TData> = async (job) => {
      const startTime = Date.now();
      const context: ActionContext = {
        jobId: job.id ?? "unknown",
        retryCount: job.attemptsMade ?? 0,
        queueName: queue.name,
        // noteId: job.data.noteId,
        operation: this.getOperationName(),
        startTime,
        workerName: this.getOperationName(),
        attemptNumber: (job.attemptsMade ?? 0) + 1,
      };
      const data = job.data;
      await this.onBeforeJob(data, context);
      this.dependencies.logger.log(
        `[${this.getOperationName().toUpperCase()}] Starting job ${context.jobId}`
      );
      try {
        const actions = this.createActionPipeline(data, context);
        const result = await processJob(
          actions,
          data,
          context,
          {
            log: (
              msg: string,
              level?: string,
              meta?: Record<string, unknown>
            ) => this.dependencies.logger.log(msg, level as LogLevel, meta),
          },
          this.getOperationName.bind(this),
          this.dependencies
        );
        const totalDuration = Date.now() - startTime;
        WorkerMetrics.recordJobProcessingTime(
          this.getOperationName(),
          totalDuration,
          true
        );
        this.dependencies.logger.log(
          `${this.getOperationName()} completed for job ${context.jobId} in ${totalDuration}ms`,
          LogLevel.INFO,
          { duration: totalDuration, jobId: context.jobId }
        );
        await this.onAfterJob(data, context, result as TResult);
        return result as Record<string, unknown>;
      } catch (error) {
        const totalDuration = Date.now() - startTime;
        WorkerMetrics.recordJobProcessingTime(
          this.getOperationName(),
          totalDuration,
          false
        );
        this.dependencies.logger.log(
          `${this.getOperationName()} failed for job ${context.jobId}: ${error}`,
          LogLevel.ERROR,
          { duration: totalDuration, jobId: context.jobId, error }
        );
        await this.onJobError(error as Error, data, context);
        throw error;
      }
    };
    if (workerImpl) {
      return workerImpl(
        queue,
        jobProcessor,
        this.config.concurrency ?? this.getConcurrency()
      );
    }
    // Default: BullMQ Worker
    // Use dynamic imports instead of require
    const { Worker } = await import("bullmq");
    const { redisConfig } = await import("../../config/redis");

    // Create the worker with proper typing
    // Use type assertion that's compatible with BullMQ's expected Processor type
    const bullMQWorker = new Worker(
      queue.name,
      jobProcessor as unknown as (job: unknown) => Promise<unknown>,
      {
        connection: redisConfig,
        concurrency: this.config.concurrency ?? this.getConcurrency(),
      }
    );

    // Return a wrapper that implements IWorker interface
    return {
      isRunning: () => bullMQWorker.isRunning(),
    };
  }

  /**
   * Get the concurrency level for this worker (can be overridden)
   */
  protected getConcurrency(): number {
    return 5;
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
