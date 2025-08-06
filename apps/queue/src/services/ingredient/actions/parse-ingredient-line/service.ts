// Parse a single ingredient line using the configured parser version
// and normalize the parser output into the shared ParsedSegment format.
import type { ParserResult } from "./types";

import type { ParsedSegment } from "../../../../schemas/base";
import type { StructuredLogger } from "../../../../types";
import type { IngredientJobData } from "../../../../workers/ingredient/dependencies";
import { CachedIngredientParser } from "../../cached-ingredient-parser";

/**
 * Parse an ingredient line into structured segments.
 */
export async function parseIngredientLine(
  data: IngredientJobData,
  logger: StructuredLogger
): Promise<IngredientJobData> {
  if (!data.noteId) {
    throw new Error("No note ID available for ingredient parsing");
  }

  if (!data.ingredientReference) {
    throw new Error("No ingredient reference available for parsing");
  }

  try {
    const startTime = Date.now();

    // Check if we should clear cache (for testing or when cache is stale)
    const shouldClearCache = data.metadata?.clearCache === true;
    if (shouldClearCache) {
      logger.log(
        `[PARSE_INGREDIENT_LINE] Clearing ingredient cache as requested`
      );
      await CachedIngredientParser.invalidateIngredientCache();
    }

    // First, check if we have a cached result for this exact ingredient string
    let parseResult: ParserResult = { rule: "", type: "", values: [] };
    let parsedSegments: ParsedSegment[] = [];
    let usedCache = false;

    try {
      const cachedResult = await CachedIngredientParser.parseIngredientLine(
        data.ingredientReference,
        { cacheResults: true },
        logger
      );

      // If we got a cached result, use it (no confidence check needed since it's the actual v1 parser result)
      usedCache = true;
      logger.log(
        `[CACHED RESULT] Using cached result for: ${JSON.stringify(
          cachedResult,
          null,
          2
        )}`
      );

      // Convert cached parser result to ParsedSegment format
      const cachedSegments: ParsedSegment[] = [];
      let segmentIndex = 0;

      // Map the cached result values to ParsedSegment format
      cachedResult.values.forEach((segment) => {
        cachedSegments.push({
          index: segmentIndex++,
          rule: segment.rule,
          type: segment.type as ParsedSegment["type"],
          value: segment.value,
          processingTime: segment.processingTime,
        });
      });

      parsedSegments = cachedSegments;
      parseResult = {
        rule: "cached_result",
        type: "cached",
        values: cachedSegments,
      };

      // Log the cached result structure
      logger.log(
        `[PARSE_INGREDIENT_LINE] Cached result structure: ${JSON.stringify(parseResult, null, 2)}`
      );
    } catch (cachedError) {
      logger.log(`[PARSE_INGREDIENT_LINE] Cache check failed: ${cachedError}`);
    }

    // If no cached result or low confidence, use the main parser
    if (!usedCache) {
      logger.log(
        `[PARSE_INGREDIENT_LINE] No cached result found, using main parser for: "${data.ingredientReference}"`
      );

      let parse: (input: string) => ParserResult;

      try {
        // Use v1 parser
        const v1Module = await import("@peas/parser/v1/minified");
        parse = v1Module.parse;
        logger.log(
          `[PARSE_INGREDIENT_LINE] Using v1 parser for: "${data.ingredientReference}"`
        );
      } catch (v1Error) {
        logger.log(`[PARSE_INGREDIENT_LINE] v1 parser failed: ${v1Error}`);
        throw new Error(`Failed to load v1 ingredient parser: ${v1Error}`);
      }

      parseResult = parse(data.ingredientReference);

      // Log the entire stringified parser result
      logger.log(
        `[PARSE_INGREDIENT_LINE] v1 parser raw result: ${JSON.stringify(parseResult, null, 2)}`
      );

      // Map raw parser segments → shared ParsedSegment shape
      parsedSegments = parseResult.values.map((seg, idx) => ({
        index: idx,
        rule: seg.rule,
        type: seg.type as ParsedSegment["type"],
        value: String(seg.value),
        processingTime: Date.now() - startTime,
      }));
    }

    const updatedData: IngredientJobData = {
      ...data,
      parseStatus:
        parsedSegments.length > 0
          ? "COMPLETED_SUCCESSFULLY"
          : "COMPLETED_WITH_ERROR",
      metadata: {
        ...data.metadata,
        parsedSegments,
        parseResult,
        rule: parseResult.rule,
        usedCache,
        parserVersion: usedCache ? "cached" : "v1",
      },
    };

    return updatedData;
  } catch (error) {
    logger.log(
      `[PARSE_INGREDIENT_LINE] Failed to parse ingredient "${data.ingredientReference}": ${error}`
    );

    /* istanbul ignore next -- @preserve */
    return {
      ...data,
      parseStatus: "COMPLETED_WITH_ERROR",
      metadata: {
        ...data.metadata,
        error: error instanceof Error ? error.message : String(error),
        errorTimestamp: new Date().toISOString(),
      },
    };
  }
}
