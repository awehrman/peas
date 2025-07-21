import { LOG_MESSAGES } from "../config/constants";
import { formatLogMessage, measureExecutionTime } from "../utils/utils";
import type {
  IngredientSegmentType,
  ParsedIngredientResult,
  ParserSegment,
} from "../workers/ingredient/types";
import { IngredientSegmentType as SegmentType } from "../workers/ingredient/types";

export interface IngredientServiceContainer {
  logger: { log: (msg: string) => void };
}

export class IngredientService {
  private container: IngredientServiceContainer;

  constructor(container: IngredientServiceContainer) {
    this.container = container;
  }

  private validateIngredientInput(text: string): string | null {
    if (!text || text.trim().length === 0) {
      return "Empty or invalid input text";
    }
    return null;
  }

  private async importIngredientParser() {
    const { v1: parser } = await import("@peas/parser");
    return parser;
  }

  private extractSegmentsFromParsedResult(parsedResult: {
    values?: ParserSegment[];
  }): ParserSegment[] {
    if (
      !parsedResult?.values ||
      !Array.isArray(parsedResult.values) ||
      parsedResult.values.length === 0
    ) {
      return [];
    }
    return parsedResult.values
      .filter((segment) => segment && (segment.values || segment.value))
      .map((segment, index) => {
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
          rule: segment.rule ?? "",
          type:
            (segment.type as IngredientSegmentType) ?? SegmentType.Ingredient,
          value: value.trim(),
          processingTime: 0,
        };
      })
      .filter((segment) => segment.value.length > 0);
  }

  private logIngredientParsingStart() {
    this.container.logger.log(
      formatLogMessage(LOG_MESSAGES.INFO.INGREDIENT_PARSING_START, {})
    );
  }

  private logIngredientParsingCompleted(status: string, segments: number) {
    this.container.logger.log(
      formatLogMessage(LOG_MESSAGES.SUCCESS.INGREDIENT_PARSING_COMPLETED, {
        status,
        segments,
      })
    );
  }

  private logIngredientParsingError(error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    this.container.logger.log(
      formatLogMessage(LOG_MESSAGES.ERROR.INGREDIENT_PARSING_FAILED, {
        error: errorMessage,
      })
    );
  }

  private formatIngredientParseResult(
    segments: ParserSegment[],
    hasValidSegments: boolean,
    errorMessage?: string
  ): ParsedIngredientResult {
    return {
      success: hasValidSegments,
      parseStatus: hasValidSegments ? "CORRECT" : "ERROR",
      segments: segments.map((segment, index) => ({
        index,
        rule: segment.rule ?? "",
        type: segment.type ?? "ingredient",
        value: segment.value?.trim() ?? "",
        processingTime: segment.processingTime ?? 0,
      })),
      processingTime: 0,
      ...(hasValidSegments
        ? {}
        : {
            errorMessage: errorMessage || "No valid ingredient segments found",
          }),
    };
  }

  /**
   * Parses an ingredient line using the parser and normalizes the result.
   */
  async parseIngredient(text: string): Promise<ParsedIngredientResult> {
    const { result } = await measureExecutionTime(async () => {
      this.logIngredientParsingStart();
      const inputError = this.validateIngredientInput(text);
      if (inputError) {
        this.container.logger.log(
          formatLogMessage(LOG_MESSAGES.ERROR.INGREDIENT_EMPTY_INPUT, {})
        );
        return this.formatIngredientParseResult([], false, inputError);
      }
      try {
        const parser = await this.importIngredientParser();
        const parsedResult = parser.parse(text) as {
          values?: ParserSegment[];
        };
        const segments = this.extractSegmentsFromParsedResult(parsedResult);
        const hasValidSegments = segments.length > 0;
        const result = this.formatIngredientParseResult(
          segments,
          hasValidSegments,
          hasValidSegments ? undefined : "No valid ingredient segments found"
        );
        this.logIngredientParsingCompleted(result.parseStatus, segments.length);
        return result;
      } catch (error) {
        this.logIngredientParsingError(error);
        return this.formatIngredientParseResult(
          [],
          false,
          error instanceof Error ? error.message : String(error)
        );
      }
    }, "ingredient_parsing");
    return result;
  }
}
