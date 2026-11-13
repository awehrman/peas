import {
  type ReinterpretJobData,
  type ReinterpretWorkerDependencies,
  buildReinterpretDependencies,
} from "./dependencies";

import type { Queue } from "bullmq";

import type { IServiceContainer } from "../../services/container";
import { registerReinterpretActions } from "../../services/reinterpret/actions";
import { ActionName } from "../../types";
import { ActionFactory } from "../core/action-factory";
import { BaseWorker } from "../core/base-worker";
import type { ActionContext, WorkerAction } from "../core/types";

function actionFor(data: ReinterpretJobData): ActionName {
  if (data.kind === "CORPUS_HEALTH_SNAPSHOT") return ActionName.CORPUS_HEALTH_SNAPSHOT;
  if (data.kind === "EXPLORATORY_SWEEP") return ActionName.EXPLORATORY_SWEEP;
  return data.lineIds ? ActionName.REINTERPRET_BATCH : ActionName.REINTERPRET_FAN_OUT;
}

/** Background reinterpretation runs (Phase 5f): a fan-out job per run, then batch jobs, two at a time. Corpus health snapshots and exploratory sweeps (Phase 6) share the queue. */
export class ReinterpretWorker extends BaseWorker<
  ReinterpretJobData,
  ReinterpretWorkerDependencies,
  ReinterpretJobData
> {
  constructor(
    queue: Queue,
    container: IServiceContainer,
    actionFactory?: ActionFactory<ReinterpretJobData, ReinterpretWorkerDependencies, ReinterpretJobData>
  ) {
    super(queue, buildReinterpretDependencies(container), actionFactory, container);
  }

  protected getOperationName(): string {
    return "reinterpret";
  }

  protected getConcurrency(): number {
    return 2;
  }

  protected registerActions(): void {
    registerReinterpretActions(this.actionFactory);
  }

  protected createActionPipeline(
    data: ReinterpretJobData,
    _context: ActionContext
  ): WorkerAction<ReinterpretJobData, ReinterpretWorkerDependencies, ReinterpretJobData>[] {
    return [this.actionFactory.create(actionFor(data), this.dependencies)];
  }
}

export function createReinterpretWorker(queue: Queue, container: IServiceContainer): ReinterpretWorker {
  return new ReinterpretWorker(queue, container);
}
