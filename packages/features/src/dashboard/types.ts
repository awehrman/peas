export interface LabelCount {
  label: string;
  count: number;
}

export interface TopConcept {
  conceptId: string;
  name: string;
  lineCount: number;
}

export interface NoteStatusCounts {
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  duplicate: number;
}

export interface IngredientLineStats {
  total: number;
  parsedSuccessfully: number;
  parsedWithErrors: number;
  awaitingParsing: number;
  markedCorrect: number;
  markedIncorrect: number;
}

export interface YearCount {
  year: number;
  count: number;
}

/** Mirrors the `dashboardStats` GraphQL query. */
export interface DashboardStats {
  noteCount: number;
  recipeCount: number;
  notesReadyToPromote: number;
  conceptCount: number;
  verifiedConceptCount: number;
  instructionLineCount: number;
  notesByStatus: NoteStatusCounts;
  ingredientLines: IngredientLineStats;
  topConcepts: TopConcept[];
  topSources: LabelCount[];
  topCategories: LabelCount[];
  topTags: LabelCount[];
  notesBySavedYear: YearCount[];
}

/**
 * A food's direct settled mentions (and notes) and its mentions including kinds and parts.
 *
 * @example
 * { concept: { id: "0193...", canonicalName: "chicken", status: "VERIFIED" }, directMentions: 3, directNotes: 3, expandedMentions: 15 }
 */
export interface ConceptUsageRank {
  concept: { id: string; canonicalName: string; status: string };
  directMentions: number;
  directNotes: number;
  expandedMentions: number;
}

/** Corpus-wide usage (Phase 8-D), over settled mentions only. */
export interface CorpusAnalytics {
  computedAt: string;
  isStale: boolean;
  settledMentions: number;
  conceptsWithMentions: number;
  unusedVerifiedConcepts: number;
  rareConceptCount: number;
  topExpanded: ConceptUsageRank[];
  rare: ConceptUsageRank[];
  preparations: { preparationKey: string; label: string; mentions: number; concepts: number }[];
  attributes: {
    definitionKey: string;
    definitionName: string;
    valueKey: string;
    label: string;
    mentions: number;
    asserted: number;
  }[];
}
