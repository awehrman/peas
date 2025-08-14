import { buildPatternTrackingDependencies } from "./dependencies";
import type {
  PatternTrackingJobData,
  PatternTrackingWorkerDependencies,
} from "./dependencies";
import { createPatternTrackingPipeline } from "./pipeline";

import { Queue } from "bullmq";

import { IServiceContainer } from "../../services/container";
import { registerPatternTrackingActions } from "../../services/pattern-tracking/register";
import { ActionFactory } from "../core/action-factory";
import { BaseWorker } from "../core/base-worker";
import type { ActionContext, WorkerAction } from "../core/types";

/**
 * PatternTrackingWorker class that extends BaseWorker for processing pattern tracking jobs
 */
export class PatternTrackingWorker extends BaseWorker<
  PatternTrackingJobData,
  PatternTrackingWorkerDependencies,
  PatternTrackingJobData
> {
  protected actionFactory: ActionFactory<
    PatternTrackingJobData,
    PatternTrackingWorkerDependencies,
    PatternTrackingJobData
  >;

  constructor(
    queue: Queue,
    dependencies: PatternTrackingWorkerDependencies,
    actionFactory: ActionFactory<
      PatternTrackingJobData,
      PatternTrackingWorkerDependencies,
      PatternTrackingJobData
    >,
    container: IServiceContainer
  ) {
    super(queue, dependencies, actionFactory, container);
    this.actionFactory = actionFactory;
    this.registerActions();
  }

  /**
   * Register actions specific to pattern tracking processing
   */
  protected registerActions(): void {
    registerPatternTrackingActions(this.actionFactory);
  }

  /**
   * Get the operation name for this worker
   */
  protected getOperationName(): string {
    return "pattern-tracking-worker";
  }

  /**
   * Create the action pipeline for pattern tracking processing
   */
  protected createActionPipeline(
    data: PatternTrackingJobData,
    context: ActionContext
  ): WorkerAction<
    PatternTrackingJobData,
    PatternTrackingWorkerDependencies,
    PatternTrackingJobData
  >[] {
    return createPatternTrackingPipeline(
      this.actionFactory,
      this.dependencies,
      data,
      context
    );
  }

  /**
   * Override to prevent status actions from being injected for pattern tracking
   * Pattern tracking is a background task that shouldn't affect main note processing status
   */
  protected injectStandardStatusActions(
    _actions: WorkerAction<
      PatternTrackingJobData,
      PatternTrackingWorkerDependencies,
      PatternTrackingJobData
    >[],
    _data: PatternTrackingJobData
  ): void {
    // Do nothing - pattern tracking worker doesn't need status actions
    // This prevents interference with the main note processing status
  }
}

/**
 * Create a pattern tracking worker instance
 */
export function createPatternTrackingWorker(
  queue: Queue,
  container: IServiceContainer
): PatternTrackingWorker {
  const dependencies = buildPatternTrackingDependencies(container);
  const actionFactory = new ActionFactory<
    PatternTrackingJobData,
    PatternTrackingWorkerDependencies,
    PatternTrackingJobData
  >();

  return new PatternTrackingWorker(
    queue,
    dependencies,
    actionFactory,
    container
  );
}
