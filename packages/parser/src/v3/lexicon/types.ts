import type { LexiconRole } from "../ast/types.js";

export const LEXICON_ENTRY_STATUSES = ["ACTIVE", "PROPOSED"] as const;
export type LexiconEntryStatus = (typeof LEXICON_ENTRY_STATUSES)[number];

export interface LexiconEntryInput {
  id: string;
  /** Original text; normalized and tokenized when the lexicon is built. */
  text: string;
  role: LexiconRole;
  /** Defaults to ACTIVE. Conservative parsing only sees ACTIVE entries. */
  status?: LexiconEntryStatus;
}

export interface LexiconSnapshot {
  revision: number | null;
  entries: LexiconEntryInput[];
}

/** A run of tokens in normalized text that spells one or more entries. */
export interface LexiconMatch {
  /** Character offsets in normalized text, half-open. */
  start: number;
  end: number;
  /** Token indexes, half-open. */
  tokenStart: number;
  tokenEnd: number;
  entryIds: string[];
  roles: LexiconRole[];
}

/** Chosen matches keyed by their start offset, as the grammar consumes them. */
export type MatchesByStart = Map<number, LexiconMatch>;
