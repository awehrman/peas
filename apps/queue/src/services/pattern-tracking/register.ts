import { ActionName } from "../../types";
import { ActionFactory } from "../../workers/core/action-factory";
import type {
  PatternTrackingJobData,
  PatternTrackingWorkerDependencies,
} from "../../workers/pattern-tracking/dependencies";
import {
  createActionRegistration,
  registerActions,
} from "../../workers/shared/action-registry";

import { TrackPatternAction } from "./actions/track-pattern/action";

/**
 * Register all pattern tracking actions in the given ActionFactory with type safety
 */
export function registerPatternTrackingActions(
  factory: ActionFactory<
    PatternTrackingJobData,
    PatternTrackingWorkerDependencies,
    PatternTrackingJobData
  >
): void {
  if (!factory || typeof factory !== "object") {
    throw new Error("Invalid factory");
  }
  registerActions(factory, [
    createActionRegistration<
      PatternTrackingJobData,
      PatternTrackingWorkerDependencies,
      PatternTrackingJobData
    >(ActionName.TRACK_PATTERN, TrackPatternAction),
  ]);
}
