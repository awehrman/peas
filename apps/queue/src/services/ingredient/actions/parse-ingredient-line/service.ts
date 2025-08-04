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
    logger.log(
      `[PARSE_INGREDIENT_LINE] Starting to parse ingredient: "${data.ingredientReference}" for note: ${data.noteId}`
    );

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
        { cacheResults: true }
      );

      // If we got a cached result with good confidence, use it
      if (cachedResult.confidence >= 0.7) {
        usedCache = true;
        logger.log(
          `[PARSE_INGREDIENT_LINE] Using cached result for: "${data.ingredientReference}" (confidence: ${cachedResult.confidence})`
        );

        // Convert cached parser result to ParsedSegment format
        const cachedSegments: ParsedSegment[] = [];
        let segmentIndex = 0;

        /* istanbul ignore next -- @preserve */
        if (cachedResult.amount) {
          cachedSegments.push({
            index: segmentIndex++,
            rule: "amount",
            type: "amount",
            value: cachedResult.amount,
            processingTime: cachedResult.processingTime,
          });
        }

        if (cachedResult.unit) {
          cachedSegments.push({
            index: segmentIndex++,
            rule: "unit",
            type: "unit",
            value: cachedResult.unit,
            processingTime: cachedResult.processingTime,
          });
        }

        if (cachedResult.ingredient) {
          cachedSegments.push({
            index: segmentIndex++,
            rule: "ingredient",
            type: "ingredient",
            value: cachedResult.ingredient,
            processingTime: cachedResult.processingTime,
          });
        }

        if (cachedResult.modifiers && cachedResult.modifiers.length > 0) {
          cachedSegments.push({
            index: segmentIndex++,
            rule: "modifier",
            type: "modifier",
            value: cachedResult.modifiers.join(", "),
            processingTime: cachedResult.processingTime,
          });
        }

        parsedSegments = cachedSegments;
        parseResult = {
          rule: "cached_result",
          type: "cached",
          values: cachedSegments,
        };

        logger.log(
          `[PARSE_INGREDIENT_LINE] Cached result used: ${cachedSegments.length} segments`
        );
      } else {
        logger.log(
          `[PARSE_INGREDIENT_LINE] Cached result confidence too low (${cachedResult.confidence}), will use main parser`
        );
      }
    } catch (cachedError) {
      logger.log(`[PARSE_INGREDIENT_LINE] Cache check failed: ${cachedError}`);
    }

    // If no cached result or low confidence, use the main parser
    if (!usedCache) {
      logger.log(
        `[PARSE_INGREDIENT_LINE] No cached result found, using main parser for: "${data.ingredientReference}"`
      );

      // Try v1 parser first, then fallback to v2 if needed
      let parserVersion = "v1";
      let parse: (input: string) => ParserResult;

      try {
        // Try v1 parser first
        const v1Module = await import("@peas/parser/v1/minified");
        parse = v1Module.parse;
        logger.log(
          `[PARSE_INGREDIENT_LINE] Using v1 parser for: "${data.ingredientReference}"`
        );
      } catch (v1Error) {
        logger.log(
          `[PARSE_INGREDIENT_LINE] v1 parser failed, trying v2: ${v1Error}`
        );

        try {
          // Fallback to v2 parser
          const v2Module = await import("@peas/parser/v2/minified");
          parse = v2Module.parse;
          parserVersion = "v2";
          logger.log(
            `[PARSE_INGREDIENT_LINE] Using v2 parser for: "${data.ingredientReference}"`
          );
        } catch (v2Error) {
          logger.log(
            `[PARSE_INGREDIENT_LINE] Both v1 and v2 parsers failed: ${v2Error}`
          );
          throw new Error(`Failed to load ingredient parser: ${v2Error}`);
        }
      }

      parseResult = parse(data.ingredientReference);

      // Map raw parser segments → shared ParsedSegment shape
      parsedSegments = parseResult.values.map((seg, idx) => ({
        index: idx,
        rule: seg.rule,
        type: seg.type as ParsedSegment["type"],
        value: String(seg.value),
        processingTime: Date.now() - startTime,
      }));

      logger.log(
        `[PARSE_INGREDIENT_LINE] ${parserVersion} parser result: ${parsedSegments.length} segments`
      );
    }

    logger.log(
      `[PARSE_INGREDIENT_LINE] Final result: ${parsedSegments.length} ParsedSegment records`
    );

    const updatedData: IngredientJobData = {
      ...data,
      parseStatus: parsedSegments.length > 0 ? "CORRECT" : "ERROR",
      metadata: {
        ...data.metadata,
        parsedSegments,
        parseResult, // full parser JSON for later persistence
        rule: parseResult.rule,
        usedCache,
        parserVersion: usedCache ? "cached" : "v1", // or v2 if v1 failed
      },
    };

    logger.log(
      `[PARSE_INGREDIENT_LINE] Successfully parsed ingredient "${data.ingredientReference}" for note: ${data.noteId}`
    );

    return updatedData;
  } catch (error) {
    logger.log(
      `[PARSE_INGREDIENT_LINE] Failed to parse ingredient "${data.ingredientReference}": ${error}`
    );

    /* istanbul ignore next -- @preserve */
    return {
      ...data,
      parseStatus: "ERROR",
      metadata: {
        ...data.metadata,
        error: error instanceof Error ? error.message : String(error),
        errorTimestamp: new Date().toISOString(),
      },
    };
  }
}
