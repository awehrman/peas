export type SourceKind = "URL" | "BOOK" | "OTHER";
export type UrlCheckStatus = "UNCHECKED" | "REACHABLE" | "UNREACHABLE" | "BLOCKED";
export type BookMatchStatus = "UNMATCHED" | "AUTO_MATCHED" | "CONFIRMED" | "MANUAL";
export type BookLookupStatus =
  | "PENDING"
  | "MATCHED"
  | "AMBIGUOUS"
  | "NO_MATCH"
  | "ERROR"
  | "LEFT_UNRESOLVED";
export type NoteSourceOrigin = "EVERNOTE_IMPORT" | "DUPLICATE_MERGE" | "MANUAL";

export interface SourceUrlInfo {
  id: string;
  originalUrl: string;
  normalizedUrl: string | null;
  siteName: string | null;
  checkStatus: UrlCheckStatus;
  lastCheckedAt: string | null;
  lastSuccessfulVisitAt: string | null;
  lastHttpStatus: number | null;
  lastFailureReason: string | null;
  lastFinalUrl: string | null;
}

export interface BookInfo {
  id: string;
  title: string;
  subtitle: string | null;
  authors: string[];
  publisher: string | null;
  publishedYear: number | null;
  isbn13: string | null;
  isbn10: string | null;
  coverId: number | null;
  matchStatus: BookMatchStatus;
  openLibraryWorkKey: string | null;
}

export interface SourceInfo {
  id: string;
  kind: SourceKind;
  displayName: string | null;
  url: SourceUrlInfo | null;
  book: BookInfo | null;
  bookLookup: { id: string; status: BookLookupStatus } | null;
}

/** One note's link to a shared source. */
export interface NoteSourceLink {
  id: string;
  isPrimary: boolean;
  origin: NoteSourceOrigin;
  originalText: string | null;
  source: SourceInfo;
}

export type DuplicateKind = "EXACT" | "LIKELY" | "POSSIBLE";
export type DuplicateCandidateStatus = "PENDING" | "RESOLVED" | "DISMISSED";
export type DuplicateKeepChoice = "EXISTING" | "INCOMING" | "BOTH";

export interface DuplicateResolution {
  keep: DuplicateKeepChoice;
  mergeSources: boolean;
}

export interface DuplicateNoteSummary {
  id: string;
  title: string | null;
  status: string;
  createdAt: string;
  archivedAt: string | null;
  recipeId: string | null;
  ingredientLineCount: number;
}

export interface DuplicateCandidate {
  id: string;
  kind: DuplicateKind;
  confidence: number;
  status: DuplicateCandidateStatus;
  signals: {
    rawHtmlHash: boolean;
    contentHash: boolean;
    sharedSourceIds: string[];
    titleSimilarity: number | null;
    ingredientSimilarity: number | null;
    reasons: string[];
  };
  resolution: DuplicateResolution | null;
  resolvedAt: string | null;
  createdAt: string;
  incoming: DuplicateNoteSummary;
  existing: DuplicateNoteSummary;
}

export interface DuplicateResolutionPreview {
  keptNote: { id: string; title: string | null } | null;
  archivedNote: { id: string; title: string | null } | null;
  attachedSources: { sourceId: string; label: string; inactive: boolean }[];
  primarySourceChange: { from: string | null; to: string | null } | null;
  carriedCategories: { name: string; state: CategoryAssignmentState }[];
  carriedTags: string[];
  movedRecipeId: string | null;
  summary: string[];
}

export interface BookCandidate {
  workKey: string;
  title: string;
  subtitle: string | null;
  authors: string[];
  firstPublishYear: number | null;
  publishers: string[];
  editionCount: number | null;
  coverId: number | null;
  isbns: string[];
  matchedIsbn: string | null;
  score: number;
  evidence: string[];
}

export interface BookLookupView {
  id: string;
  query: string;
  status: BookLookupStatus;
  candidates: BookCandidate[];
  fetchedAt: string | null;
  attempts: number;
  errorReason: string | null;
  noteCount: number;
  book: BookInfo | null;
}

export interface ManualBookInput {
  title: string;
  subtitle: string | null;
  authors: string[];
  publisher: string | null;
  publishedYear: number | null;
  isbn13: string | null;
  isbn10: string | null;
}

export interface FailedUrlCheck {
  urlId: string;
  sourceId: string;
  originalUrl: string;
  checkStatus: UrlCheckStatus;
  lastCheckedAt: string | null;
  lastSuccessfulVisitAt: string | null;
  lastHttpStatus: number | null;
  lastFailureReason: string | null;
  consecutiveFailures: number;
  notes: { id: string; title: string | null }[];
}

export interface ImportReviewCounts {
  pendingImports: number;
  importedNotes: number;
  exactDuplicates: number;
  likelyDuplicates: number;
  possibleDuplicates: number;
  sourceConflicts: number;
  bookMatchesToReview: number;
  failedSourceChecks: number;
  resolved: number;
}

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export type CategoryKind = "MANUAL" | "CONCEPT";
export type CategoryAssignmentState = "INFERRED" | "APPROVED" | "EXCLUDED";
export type CategoryAssignmentOrigin = "IMPORT" | "MANUAL" | "CONCEPT_RULE" | "DUPLICATE_MERGE";
export type FoodRelationshipType = "IS_A" | "PART_OF" | "DERIVED_FROM" | "PROCESSED_FROM";

export interface CategoryEvidence {
  lineId: string;
  mentionId: string;
  conceptId: string;
  conceptName: string;
  path: { type: FoodRelationshipType; conceptId: string; conceptName: string }[];
}

export interface CategoryMembership {
  id: string;
  state: CategoryAssignmentState;
  origin: CategoryAssignmentOrigin;
  evidence: CategoryEvidence[];
  decidedAt: string | null;
  category: { id: string; name: string; slug: string; kind: CategoryKind };
}
