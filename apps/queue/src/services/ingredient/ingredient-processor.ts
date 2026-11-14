import {
  type IngredientLineResult,
  PARSER_VERSION,
  type ResolverContext,
  processIngredientLine,
} from "@peas/parser/v2";

import type { StructuredLogger } from "../../types";

import { getResolverContext } from "./lexicon-cache";

/** Stored on each line as its parserVersion. */
export const V2_PARSER_ID = `v2:${PARSER_VERSION}`;

/**
 * One line parsed and resolved by v2, with the lexicon revision it was read against.
 *
 * @example
 * { result: { line: { status: "PARSED", ... }, mentions: [{ status: "AUTO_RESOLVED", ... }] }, revision: 15, parserVersion: "v2:2.0.0" }
 */
export interface ProcessedIngredientLine {
  result: IngredientLineResult;
  revision: number;
  parserVersion: string;
}

/**
 * Parses and resolves one ingredient line with the cached resolver context, in conservative mode (only active lexicon entries), as imports do.
 *
 * @example
 * const { result } = await processLine("1 lb boneless chicken thighs", logger);
 */
export async function processLine(
  reference: string,
  logger?: StructuredLogger,
  getContext: (logger?: StructuredLogger) => Promise<ResolverContext> = getResolverContext
): Promise<ProcessedIngredientLine> {
  const context = await getContext(logger);
  const { line, mentions } = processIngredientLine(reference, context, {
    mode: "CONSERVATIVE",
  });
  return {
    result: { line, mentions },
    revision: context.revision,
    parserVersion: V2_PARSER_ID,
  };
}
