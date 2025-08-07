import { trackPattern } from "./service";

import { ActionName } from "../../../../types";
import { BaseAction } from "../../../../workers/core/base-action";
import type { ActionContext } from "../../../../workers/core/types";
import type {
  PatternTrackingJobData,
  PatternTrackingWorkerDependencies,
} from "../../../../workers/pattern-tracking/dependencies";

export class TrackPatternAction extends BaseAction<
  PatternTrackingJobData,
  PatternTrackingWorkerDependencies,
  PatternTrackingJobData
> {
  name = ActionName.TRACK_PATTERN;

  async execute(
    data: PatternTrackingJobData,
    deps: PatternTrackingWorkerDependencies,
    _context: ActionContext
  ): Promise<PatternTrackingJobData> {
    deps.logger.log(
      `[TRACK_PATTERN_ACTION] Starting execution for job ${data.jobId}`
    );
    try {
      const result = await trackPattern(data, deps.logger);
      deps.logger.log(
        `[TRACK_PATTERN_ACTION] Processing completed for job ${data.jobId}`
      );
      return result;
    } catch (error) {
      deps.logger.log(
        `[TRACK_PATTERN_ACTION] Error processing job ${data.jobId}: ${error}`
      );
      throw error;
    }
  }
}
