import type { DecisionPayload } from "@peas/parser/v2";

export type { DecisionPayload };

export const DISCOVERY_TYPES = [
  "UNKNOWN_FOOD_PHRASE",
  "UNKNOWN_MODIFIER",
  "ATTRIBUTE_INTERPRETATION",
  "IDENTITY_DECISION",
  "AMBIGUOUS_MATCH",
  "RELATIONSHIP_SUGGESTION",
  "STRUCTURAL_PATTERN",
  "VERIFIED_DRIFT",
] as const;

export type DiscoveryType = (typeof DISCOVERY_TYPES)[number];

export type MentionStatus =
  "UNRESOLVED" | "AUTO_RESOLVED" | "NEEDS_REVIEW" | "VERIFIED";

export type ParseMode = "CONSERVATIVE" | "EXPLORATORY";

export interface TextSpan {
  start: number;
  end: number;
  text: string;
}

export interface ConceptRef {
  id: string;
  canonicalName: string;
  status: "PROPOSED" | "VERIFIED" | "DEPRECATED";
}

export interface LexiconEntryRef {
  id: string;
  text: string;
  role: string;
  targetLabel: string;
  conceptId: string | null;
  attributeValueId: string | null;
}

/** One word of a parsed segment with its lexicon roles; spans are offsets into the raw line. */
export interface SyntaxToken {
  span: TextSpan;
  kind: string;
  roles: string[];
  zone: string;
}

export interface ResolutionView {
  status: MentionStatus;
  conceptId: string | null;
  conceptName: string | null;
  attributes: string[];
  preparations: string[];
  candidateCount: number;
  score: number | null;
  text: string;
  highlights: TextSpan[];
}

export interface ResolutionCandidateView {
  conceptId: string;
  conceptName: string;
  score: number;
  reasons: string[];
  attributes: string[];
  preparations: string[];
  modifiers: string[];
}

export interface DiscoveryExample {
  mentionId: string;
  noteId: string | null;
  noteTitle: string | null;
  lineText: string;
  span: TextSpan;
}

/** A review-queue item; `payload` is the DiscoveryPayload from @peas/parser/v2. */
export interface TeachDiscovery {
  id: string;
  type: DiscoveryType;
  key: string;
  status: "OPEN" | "DEFERRED" | "RESOLVED" | "REJECTED";
  priority: number;
  mentionCount: number;
  distinctNoteCount: number;
  title: string;
  payload: unknown;
  concepts: ConceptRef[];
  entries: LexiconEntryRef[];
  /** STRUCTURAL_PATTERN only: example lines as pending golden cases (JSON). */
  fixtureBlock?: string | null;
}

export interface DiscoveryTypeCount {
  type: DiscoveryType;
  count: number;
}

export interface TeachVocabulary {
  definitions: { id: string; key: string; name: string }[];
  attributeValues: {
    id: string;
    key: string;
    label: string;
    definitionId: string;
    definitionKey: string;
    definitionName: string;
  }[];
  preparations: { id: string; key: string; label: string }[];
  degreeKeys: string[];
  measurementModifierKeys: string[];
  instructionKeys: string[];
}

export interface DecisionPreviewExample {
  mentionId: string;
  noteId: string | null;
  noteTitle: string | null;
  lineText: string;
  before: ResolutionView;
  after: ResolutionView;
  verifiedConflict: boolean;
}

export interface DecisionPreview {
  revision: number;
  counts: {
    scanned: number;
    affected: number;
    newlyResolved: number;
    conceptChanged: number;
    attributesChanged: number;
    becameAmbiguous: number;
    becameUnresolved: number;
    verifiedConflicts: number;
  };
  examples: DecisionPreviewExample[];
  truncated: boolean;
}

export interface ApplyDecisionResult {
  summary: string;
  mentionsUpdated: number;
  needsBackgroundReinterpret: boolean;
  /** Set only when the queue could not take the background reinterpretation. */
  reinterpretCommand: string | null;
}

/** A background reinterpretation run as the job poller reports it. */
export interface ReinterpretProgress {
  jobId: string;
  status:
    "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED" | "CANCELLED" | "MISSING";
  processedCount: number | null;
  totalCount: number | null;
  errorMessage: string | null;
}

export type PreviewDecision = (
  payload: DecisionPayload
) => Promise<DecisionPreview>;

export type SearchConcepts = (query: string) => Promise<ConceptRef[]>;

export interface PlaygroundMention {
  segmentIndex: number;
  partIndex: number;
  span: TextSpan;
  status: MentionStatus;
  quantity: string | null;
  tokens: SyntaxToken[];
  candidates: ResolutionCandidateView[];
  unresolved: TextSpan[];
  summary: ResolutionView;
}

export interface PlaygroundResult {
  line: string;
  revision: number;
  mode: ParseMode;
  syntax: string;
  mentions: PlaygroundMention[];
  alternativeCount: number;
}

export const DISCOVERY_TYPE_LABELS: Record<DiscoveryType, string> = {
  UNKNOWN_FOOD_PHRASE: "Food vocabulary",
  UNKNOWN_MODIFIER: "Modifiers",
  ATTRIBUTE_INTERPRETATION: "Attribute meaning",
  IDENTITY_DECISION: "Identity",
  AMBIGUOUS_MATCH: "Ambiguity",
  RELATIONSHIP_SUGGESTION: "Relationships",
  STRUCTURAL_PATTERN: "Structure",
  VERIFIED_DRIFT: "Verified drift",
};

export const MENTION_STATUS_LABELS: Record<MentionStatus, string> = {
  AUTO_RESOLVED: "Resolved",
  NEEDS_REVIEW: "Needs review",
  UNRESOLVED: "Unresolved",
  VERIFIED: "Verified",
};

/** Mirrors the `corpusHealth` GraphQL query. */
export interface CorpusHealth {
  lineCount: number;
  linesWithMentions: number;
  parsedSuccessfully: number;
  parsedWithErrors: number;
  awaitingParsing: number;
  mentions: {
    total: number;
    autoResolved: number;
    needsReview: number;
    unresolved: number;
    verified: number;
  };
  openDiscoveryCount: number;
  topUnknownPhrases: {
    discoveryId: string;
    phrase: string;
    mentionCount: number;
  }[];
  reinterpretBacklog: {
    pending: number;
    processing: number;
    failed: number;
    failedBatches: number;
  };
  lexiconRevision: number;
  live: {
    windowSeconds: number;
    lineCount: number;
    linesPerSecond: number;
    structuralSuccessShare: number | null;
    averageCandidatesPerSegment: number | null;
    unknownTokens: number;
    lexiconRevision: number | null;
  } | null;
}
