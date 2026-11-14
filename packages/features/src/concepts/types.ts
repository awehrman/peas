import type { MutationAction } from "../shared";
import type { ConceptRef } from "../teach/types";

export interface ConceptSummary {
  id: string;
  slug: string;
  canonicalName: string;
  status: ConceptRef["status"];
  entryCount: number;
  mentionCount: number;
}

export interface ConceptsPageData {
  items: ConceptSummary[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ConceptEntry {
  id: string;
  text: string;
  kind: string | null;
  status: string;
}

export interface ConceptRelationship {
  id: string;
  type: string;
  status: string;
  concept: ConceptRef;
}

export interface ConceptDetail {
  id: string;
  slug: string;
  canonicalName: string;
  status: ConceptRef["status"];
  description: string | null;
  isComposed: boolean;
  mergedInto: ConceptRef | null;
  entries: ConceptEntry[];
  parents: ConceptRelationship[];
  children: ConceptRelationship[];
  attributes: {
    attributeValueId: string;
    definitionKey: string;
    valueKey: string;
    label: string;
  }[];
  classifications: ConceptClassificationRow[];
  tags: string[];
  substitutions: ConceptSubstitution[];
  mentions: {
    mentionId: string;
    rawText: string;
    lineText: string;
    noteId: string | null;
    noteTitle: string | null;
    verified: boolean;
  }[];
  decisions: {
    id: string;
    type: string;
    revision: number;
    createdAt: string;
    username: string;
    reverted: boolean;
    canRevert: boolean;
  }[];
}

export type ClassificationKind =
  "FOOD_GROUP" | "DIETARY" | "ALLERGEN" | "CATEGORY" | "CERTIFICATION";

export type ClassificationValue = "TRUE" | "FALSE" | "UNKNOWN";

/** An effective classification; `isExplicit` rows are stored on this concept and can be removed here. */
export interface ConceptClassificationRow {
  key: string;
  kind: string;
  value: string;
  source: string;
  inheritedFrom: ConceptRef | null;
  isExplicit: boolean;
}

export interface ConceptSubstitution {
  concept: ConceptRef;
  ratio: string | null;
  note: string | null;
}

/**
 * @example
 * { kind: "CATEGORY", key: "CATEGORY:Spices", value: "TRUE", note: null }
 */
export interface ClassificationInput {
  kind: ClassificationKind;
  key: string;
  value: ClassificationValue;
  note: string | null;
}

export interface SubstitutionInput {
  substituteId: string;
  ratio: string | null;
  note: string | null;
}

/** Mentions, and the distinct lines, notes, and recipes they appear in. */
export interface UsageCounts {
  mentions: number;
  lines: number;
  notes: number;
  recipes: number;
}

/**
 * How often a concept appears, directly and through more specific concepts.
 *
 * @example
 * { expand: ["IS_A", "PART_OF"], direct: { mentions: 3, ... }, expanded: { mentions: 15, ... }, byStatus: { autoResolved: 3, verified: 0, needsReview: 1 }, contributors: [...] }
 */
export interface ConceptUsage {
  expand: string[];
  includeNeedsReview: boolean;
  direct: UsageCounts;
  expanded: UsageCounts;
  byStatus: { autoResolved: number; verified: number; needsReview: number };
  contributors: {
    concept: ConceptRef;
    /** Relationship types from the concept down to the contributor. */
    path: string[];
    depth: number;
    counts: UsageCounts;
  }[];
}

export interface ObservedForm {
  entryId: string;
  text: string;
  kind: string | null;
  status: string;
  mentions: number;
  notes: number;
  example: string | null;
}

export interface ConceptDistributions {
  preparations: {
    preparationKey: string;
    label: string;
    degreeKey: string | null;
    direct: number;
    expanded: number;
  }[];
  attributes: {
    definitionKey: string;
    definitionName: string;
    valueKey: string;
    label: string;
    direct: number;
    expanded: number;
    asserted: number;
  }[];
  modifiers: {
    role: string;
    valueKey: string;
    direct: number;
    expanded: number;
  }[];
}

/** What the concept page's explorer shows (Phase 8). */
export interface ConceptExplorerData {
  usage: ConceptUsage;
  observedForms: { forms: ObservedForm[]; otherMentions: number };
  distributions: ConceptDistributions;
}

/**
 * The explorer's switches: also count foods made or processed from the concept, and also count mentions waiting for review.
 *
 * @example
 * { includeMadeFrom: false, includeNeedsReview: false }
 */
export interface ConceptExplorerOptions {
  includeMadeFrom: boolean;
  includeNeedsReview: boolean;
}

/**
 * One mention behind a concept's usage. `path` is empty for a direct mention.
 *
 * @example
 * { mentionId: "0193...", lineText: "4 chicken thighs, diced", span: { start: 0, end: 23, text: "..." }, noteId: "cm3n...", noteTitle: "Braised thighs", concept: { canonicalName: "chicken thigh", ... }, path: ["PART_OF"], status: "AUTO_RESOLVED", preparations: ["Dice"], attributes: [] }
 */
export interface ConceptOccurrence {
  mentionId: string;
  lineId: string;
  lineText: string;
  span: { start: number; end: number; text: string };
  noteId: string;
  noteTitle: string | null;
  recipeId: string | null;
  recipeTitle: string | null;
  concept: ConceptRef;
  path: string[];
  status: string;
  preparations: string[];
  attributes: string[];
}

export interface ConceptOccurrencePage {
  items: ConceptOccurrence[];
  total: number;
  nextCursor: string | null;
}

/** Choices for the occurrence filters: preparations and attributes seen on the concept's mentions, and the sources and categories of its notes. */
export interface ConceptOccurrenceFilterOptions {
  preparations: { key: string; label: string }[];
  /** `key` is "definition:value". */
  attributes: { key: string; label: string }[];
  sources: { id: string; label: string; notes: number }[];
  categories: { id: string; name: string; notes: number }[];
}

/**
 * The occurrence page's filters, as kept in the URL.
 *
 * @example
 * { includeMadeFrom: false, includeNeedsReview: false, preparationKey: "dice", attribute: "bone:boneless" }
 */
export interface ConceptOccurrenceFilters extends ConceptExplorerOptions {
  preparationKey?: string;
  attribute?: string;
  sourceId?: string;
  categoryId?: string;
  status?: "AUTO_RESOLVED" | "VERIFIED" | "NEEDS_REVIEW";
}

/** Concept page editing, bound to one concept by the app. Leave them out to render the page read-only. */
export interface ConceptEditActions {
  onSetClassification?: MutationAction<[input: ClassificationInput]>;
  onRemoveClassification?: MutationAction<[key: string]>;
  onSetTags?: MutationAction<[tags: string[]]>;
  onSetSubstitution?: MutationAction<[input: SubstitutionInput]>;
  onRemoveSubstitution?: MutationAction<[substituteId: string]>;
}
