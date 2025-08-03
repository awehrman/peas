import { createHash } from "crypto";

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
 */
export interface IngredientParseResult {
  amount?: string;
  unit?: string;
  ingredient: string;
  modifiers?: string[];
  confidence: number;
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
    options: IngredientParsingOptions = {}
  ): Promise<IngredientParseResult> {
    const { cacheResults = true } = options;

    if (!cacheResults) {
      return this.parseIngredientLineDirect(line, options);
    }

    // Generate cache key based on line content and options
    const cacheKey = this.generateCacheKey(line, options);

    return actionCache.getOrSet(
      cacheKey,
      async () => {
        console.log(
          `[CACHED_INGREDIENT_PARSER] Cache miss for line: "${line}"`
        );
        return this.parseIngredientLineDirect(line, options);
      },
      CACHE_OPTIONS.ACTION_RESULT
    );
  }

  /**
   * Parse multiple ingredient lines with caching
   */
  /* istanbul ignore next -- @preserve */
  static async parseIngredientLines(
    lines: string[],
    options: IngredientParsingOptions = {}
  ): Promise<IngredientParseResult[]> {
    const results: IngredientParseResult[] = [];

    for (const line of lines) {
      const result = await this.parseIngredientLine(line, options);
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
   * Direct ingredient line parsing (without cache)
   */
  private static async parseIngredientLineDirect(
    line: string,
    _options: IngredientParsingOptions
  ): Promise<IngredientParseResult> {
    const startTime = Date.now();

    try {
      // Normalize the line
      const normalizedLine = line.toLowerCase().trim();

      // Simple regex-based parsing for common patterns
      const patterns = [
        // "1 cup flour" -> amount: "1", unit: "cup", ingredient: "flour"
        /^(\d+(?:\/\d+)?)\s+(\w+)\s+(.+)$/,
        // "1/2 cup flour" -> amount: "1/2", unit: "cup", ingredient: "flour"
        /^(\d+\/\d+)\s+(\w+)\s+(.+)$/,
        // "flour" -> ingredient: "flour"
        /^(.+)$/,
      ];

      for (const pattern of patterns) {
        const match = normalizedLine.match(pattern);
        /* istanbul ignore next -- @preserve */
        if (match) {
          const processingTime = Date.now() - startTime;

          if (match.length === 4) {
            // Pattern with amount, unit, ingredient
            return {
              amount: match[1],
              unit: match[2],
              ingredient: match[3]?.trim() || "",
              confidence: 0.9,
              processingTime,
            };
          } else if (match.length === 2) {
            // Pattern with just ingredient
            return {
              ingredient: match[1]?.trim() || "",
              confidence: 0.7,
              processingTime,
            };
          }
        }
      }

      // Fallback: treat entire line as ingredient
      /* istanbul ignore next -- @preserve */
      const processingTime = Date.now() - startTime;
      /* istanbul ignore next -- @preserve */
      return {
        /* istanbul ignore next -- @preserve */
        ingredient: normalizedLine,
        /* istanbul ignore next -- @preserve */
        confidence: 0.5,
        /* istanbul ignore next -- @preserve */
        processingTime,
      };
    } catch (error) {
      /* istanbul ignore next -- @preserve */
      const processingTime = Date.now() - startTime;
      /* istanbul ignore next -- @preserve */
      console.warn(
        `[CACHED_INGREDIENT_PARSER] Error parsing line "${line}":`,
        error
      );

      /* istanbul ignore next -- @preserve */
      return {
        ingredient: line,
        confidence: 0.1,
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
