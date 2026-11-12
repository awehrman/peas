/**
 * Weights for ranking candidates. Scores are ranking values clamped to [0, 1], not probabilities; the evaluation report shows how precision changes across thresholds.
 */
export interface ScoringConfig {
  /** Starting score for any candidate with a head. */
  base: number;
  /** Times the share of main-phrase content the candidate explains (0-1). */
  explained: number;
  /** Times min(head tokens, 3) / 3: longer head matches are more specific. */
  matchLength: number;
  /** Subtracted per unknown main-phrase token. */
  unknown: number;
  /** Subtracted per ambiguous lexeme (several meanings kept). */
  ambiguity: number;
  /** Times the share of verified mentions of this phrase that chose this concept. */
  verifiedPrior: number;
  /** Most unknown main-phrase tokens a mention may have and still be AUTO_RESOLVED. */
  maxUnknownForAuto: number;
  /** Lead over the runner-up a candidate needs to be AUTO_RESOLVED when several remain. */
  minMargin: number;
}

export const DEFAULT_SCORING_CONFIG: ScoringConfig = {
  base: 0.3,
  explained: 0.4,
  matchLength: 0.2,
  unknown: 0.15,
  ambiguity: 0.1,
  verifiedPrior: 0.1,
  maxUnknownForAuto: 0,
  minMargin: 0.15,
};

export interface ScoreInput {
  headTokens: number;
  explainedRatio: number;
  unknownTokens: number;
  ambiguousLexemes: number;
  priorShare: number;
}

/**
 * @example
 * // "1 lb chicken thighs": a two-token head explaining the whole phrase
 * scoreCandidate({ headTokens: 2, explainedRatio: 1, unknownTokens: 0, ambiguousLexemes: 0, priorShare: 0 }) // 0.83
 */
export function scoreCandidate(
  input: ScoreInput,
  config: ScoringConfig = DEFAULT_SCORING_CONFIG
): number {
  const raw =
    config.base +
    config.explained * input.explainedRatio +
    (config.matchLength * Math.min(input.headTokens, 3)) / 3 -
    config.unknown * input.unknownTokens -
    config.ambiguity * input.ambiguousLexemes +
    config.verifiedPrior * input.priorShare;
  return Math.round(Math.min(1, Math.max(0, raw)) * 1000) / 1000;
}
