/** What a block of note content is. UNKNOWN means no kind scored high enough to say. */
export const BLOCK_KINDS = [
  "INGREDIENT",
  "INSTRUCTION",
  "SECTION_HEADING",
  "NOTE",
  "OTHER",
  "UNKNOWN",
] as const;
export type BlockKind = (typeof BLOCK_KINDS)[number];

/** The kinds that collect points; UNKNOWN is the absence of a winner. */
export const SCORED_BLOCK_KINDS = [
  "INGREDIENT",
  "INSTRUCTION",
  "SECTION_HEADING",
  "NOTE",
  "OTHER",
] as const satisfies readonly BlockKind[];
export type ScoredBlockKind = (typeof SCORED_BLOCK_KINDS)[number];

/** Where the importer's DOM rules put a line. */
export const ASSIGNED_SECTIONS = ["INGREDIENT", "INSTRUCTION"] as const;
export type AssignedSection = (typeof ASSIGNED_SECTIONS)[number];

/**
 * One non-empty line of note content and where the importer filed it. `contentIndex` is the line's position in the extracted content (`Note.html` split on newlines), blank lines included.
 *
 * @example
 * { assigned: "INGREDIENT", contentIndex: 3, text: "2 tbsp olive oil", blockIndex: 0, lineIndex: 1 }
 * { assigned: "INSTRUCTION", contentIndex: 9, text: "Preheat the oven to 400 degrees.", lineIndex: 2 }
 */
export type ContentBlock =
  | {
      assigned: "INGREDIENT";
      contentIndex: number;
      text: string;
      /** Same as ParsedIngredientLine.blockIndex and lineIndex. */
      blockIndex: number;
      lineIndex: number;
    }
  | {
      assigned: "INSTRUCTION";
      contentIndex: number;
      text: string;
      /** Same as ParsedInstructionLine.lineIndex. */
      lineIndex: number;
    };

export const SIGNAL_IDS = [
  "IMPORTER_SECTION",
  "LEADING_QUANTITY",
  "UNIT",
  "UNSPECIFIED_AMOUNT",
  "INGREDIENT_NOTE",
  "KNOWN_FOOD",
  "SHORT_PHRASE",
  "COOKING_VERB",
  "STEP_OPENER",
  "NUMBERED_STEP",
  "TEMPERATURE",
  "DURATION",
  "UNTIL",
  "SEVERAL_SENTENCES",
  "SENTENCE",
  "LONG",
  "QUANTITY_NOT_STEP",
  "VERB_NOT_INGREDIENT",
  "COLON_HEADING",
  "FOR_THE",
  "HEADING_WORD",
  "ALL_CAPS",
  "SENTENCE_NOT_HEADING",
  "NOTE_MARKER",
  "PARENTHESIZED",
  "YIELD",
  "URL",
  "FOLLOWED_BY_INGREDIENTS",
  "BETWEEN_INGREDIENTS",
  "NEXT_TO_INSTRUCTIONS",
] as const;
export type SignalId = (typeof SIGNAL_IDS)[number];

/**
 * One piece of evidence: points for (or, when negative, against) a kind.
 *
 * @example
 * { id: "COOKING_VERB", kind: "INSTRUCTION", weight: 3, text: "preheat" }
 * { id: "LEADING_QUANTITY", kind: "INGREDIENT", weight: 3 }
 */
export interface BlockSignal {
  id: SignalId;
  kind: ScoredBlockKind;
  weight: number;
  /** The words that gave it away, when there are some. */
  text?: string;
}

export type BlockScores = Record<ScoredBlockKind, number>;
