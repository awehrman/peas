import type {
  IngredientWorkerDependencies,
  ParsedIngredientResult,
} from "./types";

import { LOG_MESSAGES } from "../../config/constants";
import type { IServiceContainer } from "../../services/container";
import {
  formatLogMessage,
  measureExecutionTime,
  truncateString,
} from "../../utils/utils";
import { createBaseDependenciesFromContainer } from "../core/base-worker";

// Type for a parser segment from @peas/parser
type ParserSegment = {
  rule?: string;
  type?: string;
  value?: string;
  values?: string[] | string;
};

export async function parseIngredient(
  text: string,
  container: IServiceContainer
): Promise<ParsedIngredientResult> {
  const { result } = await measureExecutionTime(async () => {
    const truncatedText = truncateString(text, 50);
    container.logger.log(
      formatLogMessage(LOG_MESSAGES.INFO.INGREDIENT_PARSING_START, {
        text: truncatedText,
      })
    );
    if (!text || text.trim().length === 0) {
      container.logger.log(
        formatLogMessage(LOG_MESSAGES.ERROR.INGREDIENT_EMPTY_INPUT, {})
      );
      return {
        success: false,
        parseStatus: "ERROR" as const,
        segments: [],
        processingTime: 0,
        errorMessage: "Empty or invalid input text",
      };
    }
    try {
      const { v1: parser } = await import("@peas/parser");
      const parsedResult = parser.parse(text);
      if (
        !parsedResult?.values ||
        !Array.isArray(parsedResult.values) ||
        parsedResult.values.length === 0
      ) {
        container.logger.log(
          formatLogMessage(LOG_MESSAGES.ERROR.INGREDIENT_PARSER_NO_DATA, {})
        );
        return {
          success: false,
          parseStatus: "ERROR" as const,
          segments: [],
          processingTime: 0,
          errorMessage: "Parser returned no valid data",
        };
      }
      const segments = parsedResult.values
        .filter(
          (segment: ParserSegment) =>
            segment && (segment.values || segment.value)
        )
        .map((segment: ParserSegment, index: number) => {
          let value: string;
          if (Array.isArray(segment.values)) {
            value = segment.values.join(" ");
          } else if (typeof segment.values === "string") {
            value = segment.values;
          } else if (segment.value) {
            value =
              typeof segment.value === "string"
                ? segment.value
                : String(segment.value);
          } else {
            value = "";
          }
          return {
            index,
            rule: segment.rule || "",
            type:
              (segment.type as "amount" | "unit" | "ingredient" | "modifier") ||
              "ingredient",
            value: value.trim(),
            processingTime: 0,
          };
        })
        .filter(
          (segment: ParserSegment) => segment.value && segment.value.length > 0
        );
      const hasValidSegments = segments.length > 0;
      const result = {
        success: hasValidSegments,
        parseStatus: hasValidSegments
          ? ("CORRECT" as const)
          : ("ERROR" as const),
        segments,
        processingTime: 0,
        ...(hasValidSegments
          ? {}
          : { errorMessage: "No valid ingredient segments found" }),
      };
      container.logger.log(
        formatLogMessage(LOG_MESSAGES.SUCCESS.INGREDIENT_PARSING_COMPLETED, {
          status: result.parseStatus,
          segments: segments.length,
        })
      );
      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      container.logger.log(
        formatLogMessage(LOG_MESSAGES.ERROR.INGREDIENT_PARSING_FAILED, {
          error: errorMessage,
        })
      );
      return {
        success: false,
        parseStatus: "ERROR" as const,
        segments: [],
        processingTime: 0,
        errorMessage: errorMessage,
      };
    }
  }, "ingredient_parsing");
  return result;
}

export function createIngredientWorkerDependencies(
  container: IServiceContainer
): IngredientWorkerDependencies {
  return {
    ...createBaseDependenciesFromContainer(container),
    categorizationQueue: container.queues.categorizationQueue,
    database: container.database,
    parseIngredient: (text) => parseIngredient(text, container),
  };
}
