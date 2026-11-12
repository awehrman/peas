import type { LexiconRole } from "../ast/types.js";

export const LEXICON_ENTRY_STATUSES = ["ACTIVE", "PROPOSED"] as const;
export type LexiconEntryStatus = (typeof LEXICON_ENTRY_STATUSES)[number];

/**
 * One known word or multi-word expression and the role it plays in a line.
 *
 * @example
 * { id: "3f0c9e52-6a1d-4c3e-9b7a-2d8e5f41c0a7", text: "extra-virgin olive oil", role: "FOOD" }
 * { id: "08e88da7-4d0e-47ad-b09a-c89e203bb87d", text: "heaping", role: "MEASUREMENT_MODIFIER" }
 * { id: "9b1d2c84-07e3-4f6a-a5c9-61e0d7b3f218", text: "virgin olive oil", role: "FOOD", status: "PROPOSED" } // only seen in EXPLORATORY mode
 */
export interface LexiconEntryInput {
  /** A UUID, e.g. from `crypto.randomUUID()`. */
  id: string;
  /** Original text; normalized and tokenized when the lexicon is built. */
  text: string;
  role: LexiconRole;
  /** Defaults to ACTIVE. Conservative parsing only sees ACTIVE entries. */
  status?: LexiconEntryStatus;
}

/**
 * A versioned set of entries, passed to `buildLexicon`.
 *
 * @example
 * { revision: 1, entries: [{ id: "c2a7e0d4-5b8f-4e19-8c3a-7f6d1e9b2a05", text: "garlic", role: "FOOD" }] }
 */
export interface LexiconSnapshot {
  revision: number | null;
  entries: LexiconEntryInput[];
}

/**
 * A run of tokens in normalized text that spells one or more entries.
 *
 * @example
 * // "3 large garlic cloves" -> tokens 3 | large | garlic | cloves
 * { start: 8, end: 21, tokenStart: 2, tokenEnd: 4, entryIds: ["5e3b9a10-2c4d-4f7e-8a6b-0d1c9e7f3a24"], roles: ["FOOD"] }
 */
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
