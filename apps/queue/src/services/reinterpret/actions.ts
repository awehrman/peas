import { ActionName } from "../../types";
import { BaseAction } from "../../workers/core/base-action";
import type { ActionFactory } from "../../workers/core/action-factory";
import type { ActionContext } from "../../workers/core/types";
import type {
  ReinterpretJobData,
  ReinterpretWorkerDependencies,
} from "../../workers/reinterpret/dependencies";
import {
  createActionRegistration,
  registerActions,
} from "../../workers/shared/action-registry";

export class ReinterpretFanOutAction extends BaseAction<
  ReinterpretJobData,
  ReinterpretWorkerDependencies,
  ReinterpretJobData
> {
  name = ActionName.REINTERPRET_FAN_OUT;

  async execute(
    data: ReinterpretJobData,
    deps: ReinterpretWorkerDependencies,
    _context: ActionContext
  ): Promise<ReinterpretJobData> {
    return deps.services.fanOut(data);
  }
}

export class ReinterpretBatchAction extends BaseAction<
  ReinterpretJobData,
  ReinterpretWorkerDependencies,
  ReinterpretJobData
> {
  name = ActionName.REINTERPRET_BATCH;

  async execute(
    data: ReinterpretJobData,
    deps: ReinterpretWorkerDependencies,
    context: ActionContext
  ): Promise<ReinterpretJobData> {
    return deps.services.runBatch(data, context.attemptNumber);
  }
}

export class CorpusHealthSnapshotAction extends BaseAction<
  ReinterpretJobData,
  ReinterpretWorkerDependencies,
  ReinterpretJobData
> {
  name = ActionName.CORPUS_HEALTH_SNAPSHOT;

  async execute(
    data: ReinterpretJobData,
    deps: ReinterpretWorkerDependencies,
    _context: ActionContext
  ): Promise<ReinterpretJobData> {
    return deps.services.snapshot(data);
  }
}

export class ExploratorySweepAction extends BaseAction<
  ReinterpretJobData,
  ReinterpretWorkerDependencies,
  ReinterpretJobData
> {
  name = ActionName.EXPLORATORY_SWEEP;

  async execute(
    data: ReinterpretJobData,
    deps: ReinterpretWorkerDependencies,
    _context: ActionContext
  ): Promise<ReinterpretJobData> {
    return deps.services.sweep(data);
  }
}

export function registerReinterpretActions(
  factory: ActionFactory<ReinterpretJobData, ReinterpretWorkerDependencies, ReinterpretJobData>
): void {
  registerActions(factory, [
    createActionRegistration<ReinterpretJobData, ReinterpretWorkerDependencies, ReinterpretJobData>(
      ActionName.REINTERPRET_FAN_OUT,
      ReinterpretFanOutAction
    ),
    createActionRegistration<ReinterpretJobData, ReinterpretWorkerDependencies, ReinterpretJobData>(
      ActionName.REINTERPRET_BATCH,
      ReinterpretBatchAction
    ),
    createActionRegistration<ReinterpretJobData, ReinterpretWorkerDependencies, ReinterpretJobData>(
      ActionName.CORPUS_HEALTH_SNAPSHOT,
      CorpusHealthSnapshotAction
    ),
    createActionRegistration<ReinterpretJobData, ReinterpretWorkerDependencies, ReinterpretJobData>(
      ActionName.EXPLORATORY_SWEEP,
      ExploratorySweepAction
    ),
  ]);
}
