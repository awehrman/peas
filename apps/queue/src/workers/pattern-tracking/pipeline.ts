import type {
  PatternTrackingJobData,
  PatternTrackingWorkerDependencies,
} from "./dependencies";
import { ActionName } from "../../types";
import { ActionFactory } from "../core/action-factory";
import type { ActionContext, WorkerAction } from "../core/types";

export function createPatternTrackingPipeline(
  actionFactory: ActionFactory<
    PatternTrackingJobData,
    PatternTrackingWorkerDependencies,
    PatternTrackingJobData
  >,
  dependencies: PatternTrackingWorkerDependencies,
  _data: PatternTrackingJobData,
  _context: ActionContext
): WorkerAction<
  PatternTrackingJobData,
  PatternTrackingWorkerDependencies,
  PatternTrackingJobData
>[] {
  return [
    actionFactory.create(ActionName.TRACK_PATTERN, dependencies),
  ];
}
