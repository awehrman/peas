import type { TrackPatternJobData } from "./service";
import { trackPattern } from "./service";

import { ActionName } from "../../../../types";
import { BaseAction } from "../../../../workers/core/base-action";
import type { ActionContext } from "../../../../workers/core/types";

interface TrackPatternDependencies {
  logger: {
    log: (
      message: string,
      level?: string,
      meta?: Record<string, unknown>
    ) => void;
  };
}

export class TrackPatternAction extends BaseAction<
  TrackPatternJobData,
  TrackPatternDependencies
> {
  name = ActionName.TRACK_PATTERN;

  async execute(
    data: TrackPatternJobData,
    deps: TrackPatternDependencies,
    _context: ActionContext
  ): Promise<TrackPatternJobData> {
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
