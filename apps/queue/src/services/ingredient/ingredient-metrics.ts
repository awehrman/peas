import type { ParseStatus, ResolutionStatus } from "@peas/parser/v2";

export const INGREDIENT_METRICS_WINDOW_MS = 60 * 60 * 1000;
const MAX_SAMPLES = 50_000;

/** One parsed line, as the parse step saw it. */
export interface ParseSample {
  at: number;
  syntaxStatus: ParseStatus;
  /** One status per mention (segment part). */
  resolutionStatuses: readonly ResolutionStatus[];
  candidateCount: number;
  unknownTokens: number;
  lexiconRevision: number;
}

export interface IngredientMetricsSummary {
  windowSeconds: number;
  lineCount: number;
  linesPerSecond: number;
  /** Share of lines whose syntax status is PARSED, 0..1; null before any line. */
  structuralSuccessShare: number | null;
  resolutionCoverage: Record<ResolutionStatus, number>;
  /** Null before any mention. */
  averageCandidatesPerSegment: number | null;
  unknownTokens: number;
  /** The revision of the most recent line, or null. */
  lexiconRevision: number | null;
}

/**
 * A rolling window of parse samples for GET /metrics/ingredients (Phase 5g). In memory per queue process; restarts start empty.
 *
 * @example
 * const metrics = createIngredientMetrics();
 * metrics.record({ at: Date.now(), syntaxStatus: "PARSED", resolutionStatuses: ["AUTO_RESOLVED"], candidateCount: 2, unknownTokens: 0, lexiconRevision: 15 });
 * metrics.summary() // { lineCount: 1, structuralSuccessShare: 1, averageCandidatesPerSegment: 2, ... }
 */
export function createIngredientMetrics({
  windowMs = INGREDIENT_METRICS_WINDOW_MS,
  maxSamples = MAX_SAMPLES,
  now = Date.now,
}: { windowMs?: number; maxSamples?: number; now?: () => number } = {}) {
  let samples: ParseSample[] = [];

  function prune(): void {
    const cutoff = now() - windowMs;
    if (samples.length > 0 && (samples[0] as ParseSample).at < cutoff)
      samples = samples.filter((sample) => sample.at >= cutoff);
  }

  return {
    record(sample: ParseSample): void {
      samples.push(sample);
      if (samples.length > maxSamples)
        samples = samples.slice(samples.length - maxSamples);
    },

    summary(): IngredientMetricsSummary {
      prune();
      const resolutionCoverage: Record<ResolutionStatus, number> = {
        AUTO_RESOLVED: 0,
        NEEDS_REVIEW: 0,
        UNRESOLVED: 0,
        VERIFIED: 0,
      };
      let parsed = 0;
      let mentions = 0;
      let candidates = 0;
      let unknownTokens = 0;
      for (const sample of samples) {
        if (sample.syntaxStatus === "PARSED") parsed += 1;
        for (const status of sample.resolutionStatuses)
          resolutionCoverage[status] += 1;
        mentions += sample.resolutionStatuses.length;
        candidates += sample.candidateCount;
        unknownTokens += sample.unknownTokens;
      }
      const windowSeconds = windowMs / 1000;
      return {
        windowSeconds,
        lineCount: samples.length,
        linesPerSecond: samples.length / windowSeconds,
        structuralSuccessShare: samples.length ? parsed / samples.length : null,
        resolutionCoverage,
        averageCandidatesPerSegment: mentions ? candidates / mentions : null,
        unknownTokens,
        lexiconRevision: samples.at(-1)?.lexiconRevision ?? null,
      };
    },

    reset(): void {
      samples = [];
    },
  };
}

export type IngredientMetrics = ReturnType<typeof createIngredientMetrics>;

export const ingredientMetrics = createIngredientMetrics();
