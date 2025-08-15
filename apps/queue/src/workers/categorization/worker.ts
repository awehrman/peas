import type {
  CategorizationJobData,
  CategorizationWorkerDependencies,
} from "./dependencies";
import { buildCategorizationDependencies } from "./dependencies";
import { createCategorizationPipeline } from "./pipeline";

import type { Queue } from "bullmq";

import { registerCategorizationActions } from "../../services/categorization/register";
import type { IServiceContainer } from "../../services/container";
import { ActionFactory } from "../core/action-factory";
import { BaseWorker } from "../core/base-worker";
import type { ActionContext, WorkerAction } from "../core/types";
import type { StructuredLogger } from "../../types";

/**
 * Update QueueJob status for categorization jobs
 */
async function updateCategorizationQueueJob(
  jobId: string,
  status: "PROCESSING" | "COMPLETED" | "FAILED",
  logger: StructuredLogger,
  errorMessage?: string
): Promise<void> {
  try {
    const { updateQueueJob } = await import("@peas/database");
    
    await updateQueueJob(jobId, {
      status,
      errorMessage,
      completedAt: status === "COMPLETED" || status === "FAILED" ? new Date() : undefined,
    });
    
    logger.log(
      `[CATEGORIZATION_WORKER] Updated QueueJob status to ${status}: ${jobId}`
    );
  } catch (error) {
    logger.log(
      `[CATEGORIZATION_WORKER] Failed to update QueueJob status: ${error}`
    );
    // Don't throw - QueueJob tracking is optional for debugging
  }
}

/**
 * Worker for processing categorization tasks
 * Handles determining and saving categories and tags for notes
 */
export class CategorizationWorker extends BaseWorker<
  CategorizationJobData,
  CategorizationWorkerDependencies,
  CategorizationJobData
> {
  constructor(
    queue: Queue,
    container: IServiceContainer,
    actionFactory?: ActionFactory<
      CategorizationJobData,
      CategorizationWorkerDependencies,
      CategorizationJobData
    >
  ) {
    const dependencies = buildCategorizationDependencies(container);
    super(queue, dependencies, actionFactory, container);
  }

  /**
   * Get the operation name for this worker
   */
  protected getOperationName(): string {
    return "categorization";
  }

  /**
   * Register all categorization actions with the action factory
   */
  protected registerActions(): void {
    // Use centralized registration
    registerCategorizationActions(this.actionFactory);
  }

  /**
   * Create the categorization pipeline
   */
  protected createActionPipeline(
    data: CategorizationJobData,
    context: ActionContext
  ): WorkerAction<
    CategorizationJobData,
    CategorizationWorkerDependencies,
    CategorizationJobData
  >[] {
    console.log("[CATEGORIZATION_WORKER] Creating action pipeline...");
    console.log(
      "[CATEGORIZATION_WORKER] Job data:",
      JSON.stringify(data, null, 2)
    );
    console.log(
      "[CATEGORIZATION_WORKER] Context:",
      JSON.stringify(context, null, 2)
    );
    console.log(
      "[CATEGORIZATION_WORKER] Available actions:",
      this.actionFactory.getRegisteredActions()
    );

    const pipeline = createCategorizationPipeline(
      this.actionFactory,
      this.dependencies,
      data,
      context
    );

    console.log(
      "[CATEGORIZATION_WORKER] Created pipeline with",
      pipeline.length,
      "actions"
    );
    return pipeline;
  }

  /**
   * Override to track job start in QueueJob
   */
  protected async onBeforeJob(
    data: CategorizationJobData,
    context: ActionContext
  ): Promise<void> {
    await super.onBeforeJob(data, context);
    
    // Update QueueJob status to PROCESSING
    await updateCategorizationQueueJob(
      context.jobId,
      "PROCESSING",
      this.dependencies.logger
    );
  }

  /**
   * Override to track job completion in QueueJob
   */
  protected async onAfterJob(
    data: CategorizationJobData,
    context: ActionContext,
    result: CategorizationJobData
  ): Promise<void> {
    await super.onAfterJob(data, context, result);
    
    // Update QueueJob status to COMPLETED
    await updateCategorizationQueueJob(
      context.jobId,
      "COMPLETED",
      this.dependencies.logger
    );
  }

  /**
   * Override to track job errors in QueueJob
   */
  protected async onJobError(
    error: Error,
    data: CategorizationJobData,
    context: ActionContext
  ): Promise<void> {
    await super.onJobError(error, data, context);
    
    // Update QueueJob status to FAILED
    await updateCategorizationQueueJob(
      context.jobId,
      "FAILED",
      this.dependencies.logger,
      error.message
    );
  }
}
