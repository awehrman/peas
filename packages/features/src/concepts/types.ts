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

/** Concept page editing, bound to one concept by the app. Leave them out to render the page read-only. */
export interface ConceptEditActions {
  onSetClassification?: MutationAction<[input: ClassificationInput]>;
  onRemoveClassification?: MutationAction<[key: string]>;
  onSetTags?: MutationAction<[tags: string[]]>;
  onSetSubstitution?: MutationAction<[input: SubstitutionInput]>;
  onRemoveSubstitution?: MutationAction<[substituteId: string]>;
}
