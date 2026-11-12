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
  classifications: {
    key: string;
    kind: string;
    value: string;
    source: string;
    inheritedFrom: ConceptRef | null;
  }[];
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
