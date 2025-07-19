import { BaseAction } from "../../core/base-action";
import type { IngredientWorkerDependencies } from "../types";
import type { PatternRule } from "../../shared/pattern-tracker";

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
  // Tracking information from job data
  importId?: string;
  currentIngredientIndex?: number;
  totalIngredients?: number;
}

export interface TrackPatternOutput extends TrackPatternInput {
  patternTracked: boolean;
}

export class TrackPatternAction extends BaseAction<
  TrackPatternInput,
  IngredientWorkerDependencies
> {
  name = "track_pattern";

  async execute(
    input: TrackPatternInput,
    deps: IngredientWorkerDependencies
  ): Promise<TrackPatternInput> {
    try {
      deps.logger?.log(
        `[TRACK_PATTERN] Starting track pattern action for note ${input.noteId}`
      );
      deps.logger?.log(
        `[TRACK_PATTERN] Input data: noteId=${input.noteId}, ingredientLineId=${input.ingredientLineId}, reference="${input.reference}", segmentsCount=${input.parsedSegments?.length || 0}, importId=${input.importId}`
      );

      // Check if we have parsed segments to track
      if (!input.parsedSegments) {
        deps.logger?.log(
          "[TRACK_PATTERN] No parsed segments to track, skipping pattern tracking"
        );
        return input;
      }

      if (input.parsedSegments.length === 0) {
        deps.logger?.log(
          "[TRACK_PATTERN] Empty parsed segments array, skipping pattern tracking"
        );
        return input;
      }

      deps.logger?.log(
        `[TRACK_PATTERN] Found ${input.parsedSegments.length} segments to track`
      );

      // Convert segments to PatternRule format with rule numbers
      const patternRules: PatternRule[] = input.parsedSegments.map(
        (segment) => ({
          rule: segment.rule,
          ruleNumber: segment.index,
        })
      );

      deps.logger?.log(
        `[TRACK_PATTERN] Converted to pattern rules: ${JSON.stringify(patternRules, null, 2)}`
      );

      // Track the pattern (this is low priority, so we don't await it)
      deps.logger?.log(
        `[TRACK_PATTERN] Calling patternTracker.trackPattern...`
      );

      // Access patternTracker through the database service
      const patternTracker = (deps.database as any).patternTracker;
      if (!patternTracker) {
        deps.logger?.log(
          "[TRACK_PATTERN] PatternTracker not available, skipping"
        );
        return input;
      }

      patternTracker
        .trackPattern(patternRules, input.reference)
        .then(() => {
          deps.logger?.log(
            `[TRACK_PATTERN] Pattern tracking completed successfully for line: "${input.reference}"`
          );
        })
        .catch((error: Error) => {
          deps.logger?.log(
            `[TRACK_PATTERN] Error tracking pattern: ${error.message}`
          );
          deps.logger?.log(
            `[TRACK_PATTERN] Error details: noteId=${input.noteId}, ingredientLineId=${input.ingredientLineId}, reference="${input.reference}"`
          );
        });

      deps.logger?.log(
        `[TRACK_PATTERN] Pattern tracking initiated (non-blocking)`
      );
      return input;
    } catch (error) {
      deps.logger?.log(
        `[TRACK_PATTERN] Error in track pattern action: ${error instanceof Error ? error.message : String(error)}`
      );
      deps.logger?.log(
        `[TRACK_PATTERN] Error details: noteId=${input.noteId}, ingredientLineId=${input.ingredientLineId}, reference="${input.reference}"`
      );
      // Return input even if tracking fails - don't break the pipeline
      return input;
    }
  }
}
