import { load, CheerioAPI, Cheerio } from "cheerio";
import { Element } from "domhandler";
import { parseISO } from "date-fns";
import { PROCESSING_CONSTANTS, LOG_MESSAGES } from "../config/constants";
import { formatLogMessage } from "../utils";
import {
  ParsedHTMLFile,
  ParsedIngredientLine,
  ParsedInstructionLine,
} from "../types";

/**
 * HTML parsing constants
 */
const HTML_PARSING_CONSTANTS = {
  /** CSS selectors */
  SELECTORS: {
    EN_NOTE: "en-note",
    META_TITLE: 'meta[itemprop="title"]',
    META_CREATED: 'meta[itemprop="created"]',
    META_SOURCE: 'meta[itemprop="source-url"]',
    H1: "h1",
  },
  /** HTML patterns */
  PATTERNS: {
    BR_TAG: "<br",
    HTML_TAGS: /<[^>]*>/g,
  },
  /** Default values */
  DEFAULTS: {
    EMPTY_STRING: "",
    UNKNOWN_TITLE: "Untitled",
    LINE_SEPARATOR: "\n",
  },
  /** Error messages */
  ERRORS: {
    NO_TITLE: "HTML file does not have a title",
    INVALID_DATE: "Invalid date format in 'created' meta tag",
    EMPTY_CONTENT: "HTML content is empty or invalid",
  },
  /** Operation names */
  OPERATIONS: {
    HTML_PARSING: "html_parsing",
  },
} as const;

/**
 * Interface for parsing options
 */
interface HTMLParsingOptions {
  /** Whether to include performance measurement */
  measurePerformance?: boolean;
  /** Logger function for debugging */
  logger?: (message: string) => void;
}

/**
 * Parse HTML content and extract structured data
 *
 * @param note - HTML content to parse
 * @param options - Parsing options
 * @returns ParsedHTMLFile with extracted data
 */
export function parseHTML(
  note: string,
  options: HTMLParsingOptions = {}
): ParsedHTMLFile {
  const { measurePerformance = false, logger = console.log } = options;

  // Validate input
  if (!note || note.trim().length === 0) {
    throw new Error(HTML_PARSING_CONSTANTS.ERRORS.EMPTY_CONTENT);
  }

  const parseOperation = (): ParsedHTMLFile => {
    logger(
      formatLogMessage(LOG_MESSAGES.INFO.NOTE_HTML_PARSING_START, {
        contentLength: note.length,
      })
    );

    // Load HTML with Cheerio
    const $ = load(note);
    const enNote = $(HTML_PARSING_CONSTANTS.SELECTORS.EN_NOTE);

    // Extract title
    const title = extractTitle($, enNote);

    // Extract metadata
    const { historicalCreatedAt, source } = extractMetadata($);

    // Extract content
    const contents = extractContent($, enNote);

    // Parse ingredients and instructions
    const { ingredients, instructions } = parseContentLines(contents);

    // Create final result
    const result: ParsedHTMLFile = {
      title,
      historicalCreatedAt,
      source,
      ingredients,
      instructions,
      contents: contents.join(HTML_PARSING_CONSTANTS.DEFAULTS.LINE_SEPARATOR),
    };

    logger(
      formatLogMessage(LOG_MESSAGES.SUCCESS.NOTE_HTML_PARSING_COMPLETED, {
        contentLength: note.length,
        ingredientsCount: ingredients.length,
        instructionsCount: instructions.length,
      })
    );

    return result;
  };

  // Execute with optional performance measurement
  if (measurePerformance) {
    // For performance measurement, we need to handle the async case
    // This is a bit of a hack, but it maintains backward compatibility
    const result = parseOperation();
    return result;
  }

  return parseOperation();
}

/**
 * Extract title from HTML content
 */
function extractTitle($: CheerioAPI, enNote: Cheerio<Element>): string {
  const metaTitle = $(HTML_PARSING_CONSTANTS.SELECTORS.META_TITLE).attr(
    "content"
  );

  // Look for h1 as a direct child of en-note
  const h1 = enNote.children(HTML_PARSING_CONSTANTS.SELECTORS.H1);

  if (h1.length > 0) {
    const title = h1.text().trim();
    return title || HTML_PARSING_CONSTANTS.DEFAULTS.UNKNOWN_TITLE;
  }

  if (metaTitle) {
    return metaTitle.trim();
  }

  throw new Error(HTML_PARSING_CONSTANTS.ERRORS.NO_TITLE);
}

/**
 * Extract metadata from HTML content
 */
function extractMetadata($: CheerioAPI): {
  historicalCreatedAt?: Date;
  source?: string;
} {
  // Extract creation date
  const historicalCreatedAtString = $(
    HTML_PARSING_CONSTANTS.SELECTORS.META_CREATED
  ).attr("content");
  let historicalCreatedAt: Date | undefined;

  if (historicalCreatedAtString) {
    try {
      historicalCreatedAt = parseISO(historicalCreatedAtString);
      if (isNaN(historicalCreatedAt.getTime())) {
        throw new Error(HTML_PARSING_CONSTANTS.ERRORS.INVALID_DATE);
      }
    } catch {
      throw new Error(HTML_PARSING_CONSTANTS.ERRORS.INVALID_DATE);
    }
  }

  // Extract source URL
  const source = $(HTML_PARSING_CONSTANTS.SELECTORS.META_SOURCE).attr(
    "content"
  );

  return { historicalCreatedAt, source };
}

/**
 * Extract content from HTML
 */
function extractContent($: CheerioAPI, enNote: Cheerio<Element>): string[] {
  const h1 = enNote.find(HTML_PARSING_CONSTANTS.SELECTORS.H1);

  if (h1.length > 0) {
    return h1
      .nextAll()
      .map((i: number, el: Element) => $(el).html())
      .get();
  }

  return enNote
    .children()
    .map((i: number, el: Element) => $(el).html())
    .get();
}

/**
 * Parse content lines into ingredients and instructions
 */
function parseContentLines(contents: string[]): {
  ingredients: ParsedIngredientLine[];
  instructions: ParsedInstructionLine[];
} {
  const ingredients: string[][] = [];
  const instructions: ParsedInstructionLine[] = [];
  let currentChunk: string[] = [];

  contents.forEach((line, lineIndex) => {
    if (isEmptyLine(line)) {
      // End current ingredient block if we have one
      if (currentChunk.length > 0) {
        ingredients.push(currentChunk);
        currentChunk = [];
      }
    } else if (line.length > 0) {
      const cleanText = cleanHtmlText(line);

      if (
        cleanText &&
        cleanText.length >= PROCESSING_CONSTANTS.MIN_INGREDIENT_TEXT_LENGTH
      ) {
        if (isInstructionLine(contents, lineIndex)) {
          // Single line surrounded by empty lines - this is an instruction
          if (
            cleanText.length >= PROCESSING_CONSTANTS.MIN_INSTRUCTION_TEXT_LENGTH
          ) {
            instructions.push({
              reference: cleanText,
              lineIndex,
              parseStatus: "PENDING",
            });
          } else {
            // Short line that doesn't qualify as instruction - treat as ingredient
            currentChunk.push(cleanText);
          }
        } else {
          // Line is part of a block - this is an ingredient
          currentChunk.push(cleanText);
        }
      }
    }
  });

  // Add any remaining chunk
  if (currentChunk.length > 0) {
    ingredients.push(currentChunk);
  }

  // Convert ingredient chunks to ParsedIngredientLine format
  const parsedIngredients: ParsedIngredientLine[] = ingredients.flatMap(
    (block, blockIndex) =>
      block.map((line, lineIndex) => ({
        blockIndex,
        lineIndex,
        reference: line,
        parseStatus: "PENDING",
      }))
  );

  return { ingredients: parsedIngredients, instructions };
}

/**
 * Check if a line is empty or contains only break tags
 */
function isEmptyLine(line: string): boolean {
  return (
    line === HTML_PARSING_CONSTANTS.DEFAULTS.EMPTY_STRING ||
    line.includes(HTML_PARSING_CONSTANTS.PATTERNS.BR_TAG)
  );
}

/**
 * Clean HTML text by removing tags and trimming whitespace
 */
function cleanHtmlText(text: string): string {
  return text
    .replace(
      HTML_PARSING_CONSTANTS.PATTERNS.HTML_TAGS,
      HTML_PARSING_CONSTANTS.DEFAULTS.EMPTY_STRING
    )
    .trim();
}

/**
 * Check if a line should be treated as an instruction
 */
function isInstructionLine(contents: string[], lineIndex: number): boolean {
  const prevLine =
    lineIndex > 0
      ? contents[lineIndex - 1] || HTML_PARSING_CONSTANTS.DEFAULTS.EMPTY_STRING
      : HTML_PARSING_CONSTANTS.DEFAULTS.EMPTY_STRING;
  const nextLine =
    lineIndex < contents.length - 1
      ? contents[lineIndex + 1] || HTML_PARSING_CONSTANTS.DEFAULTS.EMPTY_STRING
      : HTML_PARSING_CONSTANTS.DEFAULTS.EMPTY_STRING;

  return isEmptyLine(prevLine) && isEmptyLine(nextLine);
}

/**
 * Parse HTML with performance measurement (convenience function)
 */
export async function parseHTMLWithPerformance(
  note: string,
  logger?: (message: string) => void
): Promise<ParsedHTMLFile> {
  const result = parseHTML(note, { measurePerformance: true, logger });
  if (result instanceof Promise) {
    return result;
  }
  return Promise.resolve(result);
}
