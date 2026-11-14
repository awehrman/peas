import { PARSER_VERSION } from "@peas/parser/v2";

import type { StructuredLogger } from "../../types";
import { LogLevel } from "../../types";
import {
  CACHE_OPTIONS,
  actionCache,
} from "../../workers/core/cache/action-cache";

import { type ProcessedIngredientLine, processLine } from "./ingredient-processor";
import { getResolverContext } from "./lexicon-cache";

const INGREDIENT_PARSE_ACTION = "parse_ingredient_line";
/** Must match the key shape produced by `cacheKey`. */
export const INGREDIENT_PARSE_CACHE_PREFIX = `action:${INGREDIENT_PARSE_ACTION}:`;

export interface IngredientParsingOptions {
  cacheResults?: boolean;
}

/**
 * The cache key for one line: parser version and lexicon revision are part of it, so results are never reused after a grammar or knowledge change.
 *
 * @example
 * cacheKey("1 Tbsp Butter", 15) // "action:parse_ingredient_line:v2:2.0.0:15:1 tbsp butter"
 */
export function cacheKey(line: string, revision: number): string {
  return `${INGREDIENT_PARSE_CACHE_PREFIX}v2:${PARSER_VERSION}:${revision}:${line.toLowerCase().trim()}`;
}

/**
 * v2 parse results cached per line, parser version, and lexicon revision ("1 tbsp butter" is parsed once per revision across every import).
 */
export class CachedIngredientParser {
  static async parseIngredientLine(
    line: string,
    { cacheResults = true }: IngredientParsingOptions = {},
    logger?: StructuredLogger
  ): Promise<ProcessedIngredientLine> {
    if (!cacheResults) return processLine(line, logger);
    const context = await getResolverContext(logger);
    const key = cacheKey(line, context.revision);
    return actionCache.getOrSet(
      key,
      async () => {
        logger?.log(
          `[V2_PARSE] cache miss for "${line}" at revision ${context.revision}`,
          LogLevel.DEBUG
        );
        return processLine(line, logger, async () => context);
      },
      CACHE_OPTIONS.INGREDIENT_PARSING
    );
  }

  static async parseIngredientLines(
    lines: string[],
    options: IngredientParsingOptions = {},
    logger?: StructuredLogger
  ): Promise<ProcessedIngredientLine[]> {
    const results: ProcessedIngredientLine[] = [];
    for (const line of lines)
      results.push(await this.parseIngredientLine(line, options, logger));
    return results;
  }

  /** Invalidate cached parse results, optionally only lines containing `pattern`. */
  static async invalidateIngredientCache(pattern?: string): Promise<number> {
    const cachePattern = pattern
      ? `${INGREDIENT_PARSE_CACHE_PREFIX}*${pattern.toLowerCase()}*`
      : `${INGREDIENT_PARSE_CACHE_PREFIX}*`;
    return actionCache.invalidateByPattern(cachePattern);
  }

  static getCacheStats() {
    const stats = actionCache.getStats();
    const ingredientKeys = stats.memoryKeys.filter((key) =>
      key.startsWith(INGREDIENT_PARSE_CACHE_PREFIX)
    );
    return {
      totalIngredientKeys: ingredientKeys.length,
      ingredientKeys: ingredientKeys.slice(0, 10),
      totalMemoryKeys: stats.memorySize,
    };
  }
}
