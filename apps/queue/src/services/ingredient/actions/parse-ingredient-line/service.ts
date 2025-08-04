// Parse a single ingredient line using the configured parser version
// and normalize the parser output into the shared ParsedSegment format.
import type { ParserResult } from "./types";

import { PROCESSING_CONSTANTS } from "../../../../config/constants";
import type { ParsedSegment } from "../../../../schemas/base";
import type { StructuredLogger } from "../../../../types";
import type { IngredientJobData } from "../../../../workers/ingredient/dependencies";

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

    // Dynamically load the requested parser version (v1 or v2)
    const modulePath =
      PROCESSING_CONSTANTS.INGREDIENT_PARSER_VERSION === "v1"
        ? "@peas/parser/v1/minified"
        : "@peas/parser/v2/minified";

    const { parse } = (await import(modulePath)) as {
      parse: (input: string) => ParserResult;
    };

    const parseResult = parse(data.ingredientReference);

    const processingTime = Date.now() - startTime;

    logger.log(
      `[PARSE_INGREDIENT_LINE] Parsed ${parseResult.values.length} segments in ${processingTime}ms`
    );

    // Map raw parser segments → shared ParsedSegment shape
    const parsedSegments: ParsedSegment[] = parseResult.values.map(
      (seg, idx) => ({
        index: idx,
        rule: seg.rule,
        type: seg.type as ParsedSegment["type"],
        value: String(seg.value),
        processingTime,
      })
    );

    logger.log(
      `[PARSE_INGREDIENT_LINE] Normalized into ${parsedSegments.length} ParsedSegment records`
    );

    const updatedData: IngredientJobData = {
      ...data,
      parseStatus: parsedSegments.length > 0 ? "CORRECT" : "ERROR",
      metadata: {
        ...data.metadata,
        parsedSegments,
        parseResult, // full parser JSON for later persistence
        rule: parseResult.rule,
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
