import type { DiscoveryType } from "../types";

/**
 * One stored corpus health snapshot.
 *
 * @example
 * { id: "0193...", takenAt: "2026-11-13T03:00:00.000Z", trigger: "SCHEDULED", parserVersion: "2.1.0", totalMentions: 5402, unresolvedMentions: 540, ... }
 */
export interface HealthSnapshot {
  id: string;
  takenAt: string;
  trigger: string;
  parserVersion: string;
  lexiconRevision: number;
  totalLines: number;
  totalMentions: number;
  autoResolvedMentions: number;
  needsReviewMentions: number;
  unresolvedMentions: number;
  verifiedMentions: number;
  avgCandidates: number;
  openDiscoveries: number;
}

export interface ParserVersionHealth {
  parserVersion: string;
  total: number;
  unresolved: number;
}

export interface WeeklyReview {
  weekStart: string;
  decisions: number;
  mentionsChanged: number;
}

export interface HealthPhrase {
  discoveryId: string;
  type: DiscoveryType;
  phrase: string;
  mentionCount: number;
}

/** Everything the Health tab charts (`corpusHealthTrends`). */
export interface HealthTrends {
  parserVersion: string;
  snapshots: HealthSnapshot[];
  byParserVersion: ParserVersionHealth[];
  reviewByWeek: WeeklyReview[];
  topUnknownPhrases: HealthPhrase[];
  mostAmbiguousPhrases: HealthPhrase[];
}
