import { createHash } from "crypto";

import type { StructuredLogger } from "../../types";
import { LogLevel } from "../../types";
import {
  CACHE_OPTIONS,
  CacheKeyGenerator,
  actionCache,
} from "../../workers/core/cache/action-cache";

// ============================================================================
// CACHED INGREDIENT PARSER
// ============================================================================

/**
 * Interface for ingredient parsing result
 * Matches the exact structure returned by v1 parser
 */
export interface IngredientParseResult {
  rule: string;
  type: string;
  values: Array<{
    index: number;
    rule: string;
    type: string;
    value: string;
    processingTime: number;
  }>;
  processingTime: number;
}

/**
 * Interface for ingredient parsing options
 */
export interface IngredientParsingOptions {
  strictMode?: boolean;
  allowPartial?: boolean;
  cacheResults?: boolean;
}

/**
 * Cached ingredient line parser
 * Caches parsing results for common ingredient lines like "1 tbsp butter", "2 cups flour"
 */
export class CachedIngredientParser {
  /**
   * Parse an ingredient line with caching
   */
  static async parseIngredientLine(
    line: string,
    options: IngredientParsingOptions = {},
    logger?: StructuredLogger
  ): Promise<IngredientParseResult> {
    const { cacheResults = true } = options;

    if (!cacheResults) {
      // If caching is disabled, use v1 parser directly
      return this.parseWithV1Parser(line, logger);
    }

    // Generate cache key based on line content and options
    const cacheKey = this.generateCacheKey(line, options);

    return actionCache
      .getOrSet(
        cacheKey,
        async () => {
          if (logger) {
            logger.log(
              `[CACHED_INGREDIENT_PARSER] Cache miss for line: "${line}"`,
              LogLevel.INFO,
              { line, cacheKey }
            );
          } else {
            console.log(
              `[CACHED_INGREDIENT_PARSER] Cache miss for line: "${line}"`
            );
          }
          // Use v1 parser and save result to cache
          return this.parseWithV1Parser(line, logger);
        },
        CACHE_OPTIONS.ACTION_RESULT
      )
      .then((result) => {
        // Log cache hit if we have a logger
        if (logger) {
          logger.log(
            `[CACHED_INGREDIENT_PARSER] Cache hit for line: "${line}"`,
            LogLevel.INFO,
            {
              line,
              cacheKey,
              rule: result.rule,
              type: result.type,
              valuesCount: result.values.length,
              processingTime: result.processingTime,
            }
          );
        }
        return result;
      });
  }

  /**
   * Parse multiple ingredient lines with caching
   */
  /* istanbul ignore next -- @preserve */
  static async parseIngredientLines(
    lines: string[],
    options: IngredientParsingOptions = {},
    logger?: StructuredLogger
  ): Promise<IngredientParseResult[]> {
    const results: IngredientParseResult[] = [];

    for (const line of lines) {
      const result = await this.parseIngredientLine(line, options, logger);
      results.push(result);
    }

    return results;
  }

  /**
   * Invalidate cache for specific ingredient patterns
   */
  static async invalidateIngredientCache(pattern?: string): Promise<number> {
    const cachePattern = pattern ? `ingredient:${pattern}` : "ingredient:";
    return actionCache.invalidateByPattern(cachePattern);
  }

  /**
   * Get cache statistics for ingredient parsing
   */
  static getCacheStats() {
    const stats = actionCache.getStats();
    const ingredientKeys = stats.memoryKeys.filter((key) =>
      key.startsWith("ingredient:")
    );

    return {
      totalIngredientKeys: ingredientKeys.length,
      ingredientKeys: ingredientKeys.slice(0, 10), // Show first 10
      totalMemoryKeys: stats.memorySize,
    };
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  /**
   * Generate cache key for ingredient line parsing
   */
  private static generateCacheKey(
    line: string,
    options: IngredientParsingOptions
  ): string {
    const normalizedLine = line.toLowerCase().trim();
    const optionsHash = createHash("sha256")
      .update(JSON.stringify(options))
      .digest("hex")
      .slice(0, 8);

    return CacheKeyGenerator.actionResult(
      "parse_ingredient_line",
      `${normalizedLine}_${optionsHash}`
    );
  }

  /**
   * Parse ingredient line using v1 parser
   */
  private static async parseWithV1Parser(
    line: string,
    logger?: StructuredLogger
  ): Promise<IngredientParseResult> {
    const startTime = Date.now();

    try {
      // Import and use v1 parser
      const v1Module = await import("@peas/parser/v1/minified");
      const parse = v1Module.parse;

      if (logger) {
        logger.log(
          `[CACHED_INGREDIENT_PARSER] Using v1 parser for: "${line}"`,
          LogLevel.INFO
        );
      }

      // Parse with v1 parser
      const parseResult = parse(line);
      logger?.log(
        `[CACHED_INGREDIENT_PARSER] v1 parser result: ${JSON.stringify(
          parseResult,
          null,
          2
        )}`,
        LogLevel.INFO
      );

      // Convert v1 parser result to match the exact structure from logs
      const result: IngredientParseResult = {
        rule: parseResult.rule,
        type: parseResult.type,
        values: parseResult.values.map(
          (
            segment: { type: string; value: unknown; rule: string },
            index: number
          ) => ({
            index,
            rule: segment.rule,
            type: segment.type,
            value: String(segment.value),
            processingTime: Date.now() - startTime,
          })
        ),
        processingTime: Date.now() - startTime,
      };

      if (logger) {
        logger.log(
          `[CACHED_INGREDIENT_PARSER] Converted result: ${JSON.stringify(result, null, 2)}`,
          LogLevel.INFO
        );
      }

      return result;
    } catch (error) {
      const processingTime = Date.now() - startTime;

      if (logger) {
        logger.log(
          `[CACHED_INGREDIENT_PARSER] v1 parser failed for "${line}": ${error}`,
          LogLevel.ERROR
        );
      } else {
        console.warn(
          `[CACHED_INGREDIENT_PARSER] v1 parser failed for "${line}":`,
          error
        );
      }

      // Fallback: return empty result structure
      return {
        rule: "error",
        type: "error",
        values: [],
        processingTime,
      };
    }
  }
}

// ============================================================================
// CACHE KEY GENERATORS FOR INGREDIENT PARSING
// ============================================================================

/**
 * Extend CacheKeyGenerator with ingredient-specific keys
 */
export class IngredientCacheKeyGenerator {
  /**
   * Generate key for ingredient line parsing
   */
  static ingredientLineParsing(line: string, optionsHash: string): string {
    return `ingredient:line:${line}:${optionsHash}`;
  }

  /**
   * Generate key for ingredient pattern matching
   */
  static ingredientPattern(pattern: string): string {
    return `ingredient:pattern:${pattern}`;
  }

  /**
   * Generate key for ingredient lookup
   */
  static ingredientLookup(ingredientName: string): string {
    return `ingredient:lookup:${ingredientName}`;
  }
}

// ============================================================================
// CACHE OPTIONS FOR INGREDIENT PARSING
// ============================================================================

/**
 * Cache options specific to ingredient parsing
 */
export const INGREDIENT_CACHE_OPTIONS = {
  LINE_PARSING: {
    ttl: 3600, // 1 hour
    memoryTtl: 300000, // 5 minutes in memory
    tags: ["ingredient", "parsing"],
  },
  PATTERN_MATCHING: {
    ttl: 7200, // 2 hours
    memoryTtl: 600000, // 10 minutes in memory
    tags: ["ingredient", "pattern"],
  },
  LOOKUP: {
    ttl: 1800, // 30 minutes
    memoryTtl: 120000, // 2 minutes in memory
    tags: ["ingredient", "lookup"],
  },
} as const;
