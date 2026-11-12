import type { StructuredLogger } from "../../types";

export const STATIC_V1_PARSER_ID = "static_v1";

export interface ParsedLineSegment {
  rule: string;
  type: string;
  value: string;
}

export interface ParsedLineResult {
  rule: string;
  type: string;
  values: ParsedLineSegment[];
}

export interface ResolvedIngredientParser {
  /** Stored on each parsed line as its parserVersion */
  id: string;
  parse: (line: string) => ParsedLineResult;
}

let staticV1Parser: Promise<ResolvedIngredientParser> | null = null;

async function loadStaticV1Parser(): Promise<ResolvedIngredientParser> {
  const { parse } = await import("@peas/parser/v1/minified");
  return {
    id: STATIC_V1_PARSER_ID,
    parse: (line) => {
      const result = parse(line);
      return {
        rule: result.rule,
        type: result.type,
        values: result.values.map((segment) => ({
          rule: segment.rule,
          type: segment.type,
          value: String(segment.value),
        })),
      };
    },
  };
}

/**
 * Returns the parser the import queue uses for ingredient lines (static v1
 * until v2 replaces it).
 */
export async function resolveIngredientParser(
  _logger?: StructuredLogger
): Promise<ResolvedIngredientParser> {
  staticV1Parser ??= loadStaticV1Parser();
  return staticV1Parser;
}

/** Clears the cached parser (tests and cache resets). */
export function resetParserResolver(): void {
  staticV1Parser = null;
}
