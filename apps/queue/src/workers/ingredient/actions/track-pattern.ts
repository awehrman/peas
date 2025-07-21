import { BaseAction } from "../../core/base-action";
import type { PatternRule } from "../../shared/pattern-tracker";
import type { IngredientWorkerDependencies, TrackPatternInput } from "../types";

/**
 * Action to track the pattern of parsed ingredient segments for analytics or deduplication.
 */
export class TrackPatternAction extends BaseAction<
  TrackPatternInput,
  IngredientWorkerDependencies
> {
  name = "track_pattern";

  /**
   * Executes the track pattern action.
   * @param input - The input data for pattern tracking.
   * @param deps - The ingredient worker dependencies.
   * @returns The input data (unchanged).
   */
  async execute(
    input: TrackPatternInput,
    deps: IngredientWorkerDependencies
  ): Promise<TrackPatternInput> {
    try {
      this.logStart(input, deps);
      if (!this.hasSegments(input, deps)) return input;
      const patternRules = this.convertToPatternRules(input, deps);
      await this.trackPattern(patternRules, input, deps);
      this.logInitiated(deps);
      return input;
    } catch (error) {
      this.logError(input, deps, error);
      return input;
    }
  }

  /**
   * Logs the start of pattern tracking.
   */
  private logStart(
    input: TrackPatternInput,
    deps: IngredientWorkerDependencies
  ): void {
    deps.logger?.log(
      `[TRACK_PATTERN] Starting track pattern action for note ${input.noteId}`
    );
    deps.logger?.log(
      `[TRACK_PATTERN] Input data: noteId=${input.noteId}, ingredientLineId=${input.ingredientLineId}, reference="${input.reference}", segmentsCount=${input.parsedSegments?.length || 0}, importId=${input.importId}`
    );
  }

  /**
   * Checks if parsed segments are present and logs/skips if not.
   */
  private hasSegments(
    input: TrackPatternInput,
    deps: IngredientWorkerDependencies
  ): boolean {
    if (!input.parsedSegments) {
      deps.logger?.log(
        "[TRACK_PATTERN] No parsed segments to track, skipping pattern tracking"
      );
      return false;
    }
    if (input.parsedSegments.length === 0) {
      deps.logger?.log(
        "[TRACK_PATTERN] Empty parsed segments array, skipping pattern tracking"
      );
      return false;
    }
    deps.logger?.log(
      `[TRACK_PATTERN] Found ${input.parsedSegments.length} segments to track`
    );
    return true;
  }

  /**
   * Converts parsed segments to PatternRule format.
   */
  private convertToPatternRules(
    input: TrackPatternInput,
    deps: IngredientWorkerDependencies
  ): PatternRule[] {
    const patternRules: PatternRule[] = input.parsedSegments!.map(
      (segment) => ({
        rule: segment.rule,
        ruleNumber: segment.index,
      })
    );
    deps.logger?.log(
      `[TRACK_PATTERN] Converted to pattern rules: ${JSON.stringify(patternRules, null, 2)}`
    );
    return patternRules;
  }

  /**
   * Initiates pattern tracking (non-blocking).
   */
  private async trackPattern(
    patternRules: PatternRule[],
    input: TrackPatternInput,
    deps: IngredientWorkerDependencies
  ): Promise<void> {
    deps.logger?.log(`[TRACK_PATTERN] Calling patternTracker.trackPattern...`);
    // Access patternTracker through the database service
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const patternTracker = (deps.database as any).patternTracker;
    if (!patternTracker) {
      deps.logger?.log(
        "[TRACK_PATTERN] PatternTracker not available, skipping"
      );
      return;
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
  }

  /**
   * Logs the initiation of pattern tracking.
   */
  private logInitiated(deps: IngredientWorkerDependencies): void {
    deps.logger?.log(
      `[TRACK_PATTERN] Pattern tracking initiated (non-blocking)`
    );
  }

  /**
   * Logs an error that occurred during pattern tracking.
   */
  private logError(
    input: TrackPatternInput,
    deps: IngredientWorkerDependencies,
    error: unknown
  ): void {
    deps.logger?.log(
      `[TRACK_PATTERN] Error in track pattern action: ${error instanceof Error ? error.message : String(error)}`
    );
    deps.logger?.log(
      `[TRACK_PATTERN] Error details: noteId=${input.noteId}, ingredientLineId=${input.ingredientLineId}, reference="${input.reference}"`
    );
  }
}
