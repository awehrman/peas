import {
  type IngredientLineResult,
  IngredientLineSyntaxSchema,
  ResolutionSchema,
} from "@peas/parser/v2";

import type { StructuredLogger } from "../../../../types";
import type { IngredientJobData } from "../../../../workers/ingredient/dependencies";
import { CachedIngredientParser } from "../../cached-ingredient-parser";
import {
  type IngredientMetrics,
  ingredientMetrics,
} from "../../ingredient-metrics";

/**
 * A v2 result read back from job data, validated with the shared Zod schemas so a malformed payload never reaches the save step.
 *
 * @example
 * readV2Result(data.metadata) // { line, mentions } or null
 */
export function readV2Result(
  metadata: Record<string, unknown> | undefined
): IngredientLineResult | null {
  const value = metadata?.v2Result as
    | { line?: unknown; mentions?: unknown }
    | undefined;
  if (!value || !Array.isArray(value.mentions)) return null;
  const line = IngredientLineSyntaxSchema.safeParse(value.line);
  if (!line.success) return null;
  for (const mention of value.mentions as { resolution?: unknown }[]) {
    if (!ResolutionSchema.safeParse(mention.resolution).success) return null;
  }
  return {
    line: line.data,
    mentions: value.mentions as IngredientLineResult["mentions"],
  };
}

/**
 * Parses and resolves an ingredient line with v2 (Phase 5c). The parse status reflects only the syntax (PARSED is a success; PARTIAL and FAILED are errors); how well the line resolved is tracked on its mentions and never fails the job.
 */
export async function parseIngredientLine(
  data: IngredientJobData,
  logger: StructuredLogger,
  metrics: IngredientMetrics = ingredientMetrics
): Promise<IngredientJobData> {
  if (!data.noteId) {
    throw new Error("No note ID available for ingredient parsing");
  }
  if (!data.ingredientReference) {
    throw new Error("No ingredient reference available for parsing");
  }

  try {
    if (data.metadata?.clearCache === true) {
      await CachedIngredientParser.invalidateIngredientCache();
    }

    const startedAt = Date.now();
    const { result, revision, parserVersion } =
      await CachedIngredientParser.parseIngredientLine(
        data.ingredientReference,
        { cacheResults: true },
        logger
      );
    const statuses = result.mentions.map((mention) => mention.status);
    const unknownTokens = result.mentions.reduce(
      (count, mention) => count + mention.resolution.unresolved.length,
      0
    );
    const candidateCount = result.mentions.reduce(
      (count, mention) => count + mention.resolution.candidates.length,
      0
    );
    metrics.record({
      at: Date.now(),
      syntaxStatus: result.line.status,
      resolutionStatuses: statuses,
      candidateCount,
      unknownTokens,
      lexiconRevision: revision,
    });
    logger.log(
      `[V2_PARSE] "${data.ingredientReference}" syntax=${result.line.status} mentions=${statuses.join(",") || "none"} revision=${revision} ms=${Date.now() - startedAt}`
    );

    return {
      ...data,
      parseStatus:
        result.line.status === "PARSED"
          ? "COMPLETED_SUCCESSFULLY"
          : "COMPLETED_WITH_ERROR",
      metadata: {
        ...data.metadata,
        v2Result: result,
        lexiconRevision: revision,
        parserVersion,
        resolutionStatuses: statuses,
        unknownTokens,
        candidateCount,
      },
    };
  } catch (error) {
    logger.log(
      `[V2_PARSE] Failed to parse "${data.ingredientReference}": ${error}`
    );
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
