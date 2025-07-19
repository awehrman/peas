import { BaseAction } from "../../core/base-action";
import { DatabaseOperations } from "../../shared/database-operations";

export interface TrackPatternInput {
  noteId: string;
  ingredientLineId: string;
  reference: string; // The original ingredient line text
  parsedSegments?: Array<{
    index: number;
    rule: string;
    type: string;
    value: string;
  }>;
}

export interface TrackPatternOutput extends TrackPatternInput {
  patternTracked: boolean;
}

export class TrackPatternAction extends BaseAction<
  TrackPatternInput,
  DatabaseOperations
> {
  name = "track_pattern";

  async execute(
    input: TrackPatternInput,
    deps: DatabaseOperations
  ): Promise<TrackPatternInput> {
    try {
      // Check if we have parsed segments to track
      if (!input.parsedSegments) {
        console.log(
          "[TRACK_PATTERN] No parsed segments to track, skipping pattern tracking"
        );
        return input;
      }

      // Convert segments to the format expected by PatternTracker
      const parsedSegments = input.parsedSegments.map((segment) => ({
        rule: segment.rule,
        type: segment.type,
        value: segment.value,
      }));

      // Track the pattern (this is low priority, so we don't await it)
      deps.patternTracker
        .trackPattern(parsedSegments, input.reference)
        .catch((error: Error) => {
          console.error("[TRACK_PATTERN] Error tracking pattern:", error);
        });

      return input;
    } catch (error) {
      console.error("[TRACK_PATTERN] Error in track pattern action:", error);
      // Return input even if tracking fails - don't break the pipeline
      return input;
    }
  }
}
