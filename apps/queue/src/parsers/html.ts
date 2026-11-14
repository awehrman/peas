import { HTML_PARSING_CONSTANTS } from "./constants";
import type { HTMLParsingOptions } from "./types";

import type { ParsedHTMLFile } from "@peas/database";
import { segmentContent } from "@peas/parser/v2";
import { Cheerio, CheerioAPI, load } from "cheerio";
import { parseISO } from "date-fns";
import { Element } from "domhandler";

import { LOG_MESSAGES } from "../config/constants";
import type { ParsedIngredientLine, ParsedInstructionLine } from "../types";
import { formatLogMessage } from "../utils/utils";

/**
 * Parse HTML content and extract structured data
 *
 * @param note - HTML content to parse
 * @param options - Parsing options
 * @returns ParsedHTMLFile with extracted data
 */
export function parseHTMLContent(
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
    const evernoteMetadata = extractMetadata($);

    // Extract content
    const { texts: contents, tags: contentTags } = extractContent($, enNote);

    // Parse ingredients and instructions
    const { ingredients, instructions } = parseContentLines(contents);

    // Create final result
    const result: ParsedHTMLFile = {
      title,
      ingredients,
      instructions,
      contents: contents.join(HTML_PARSING_CONSTANTS.DEFAULTS.LINE_SEPARATOR),
      contentTags,
      evernoteMetadata,
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
  originalCreatedAt?: Date;
  source?: string;
  tags?: string[];
} {
  // Extract creation date
  const originalCreatedAtString = $(
    HTML_PARSING_CONSTANTS.SELECTORS.META_CREATED
  ).attr("content");
  let originalCreatedAt: Date | undefined;

  if (originalCreatedAtString) {
    try {
      originalCreatedAt = parseISO(originalCreatedAtString);
      if (isNaN(originalCreatedAt.getTime())) {
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

  // Extract tags
  const tags: string[] = [];
  $(HTML_PARSING_CONSTANTS.SELECTORS.META_TAG).each((_, element) => {
    const tagContent = $(element).attr("content");
    if (tagContent && tagContent.trim()) {
      tags.push(tagContent.trim());
    }
  });

  return {
    originalCreatedAt,
    source,
    tags: tags.length > 0 ? tags : undefined,
  };
}

/**
 * Extract content from HTML: the text of each en-note child after the title (or of every child when there is no h1), and each child's element name.
 */
function extractContent(
  $: CheerioAPI,
  enNote: Cheerio<Element>
): { texts: string[]; tags: string[] } {
  const h1 = enNote.find(HTML_PARSING_CONSTANTS.SELECTORS.H1);
  const elements = h1.length > 0 ? h1.nextAll() : enNote.children();
  return {
    texts: elements
      /* istanbul ignore next -- @preserve */
      .map((i: number, el: Element) => $(el).text())
      .get(),
    tags: elements
      /* istanbul ignore next -- @preserve */
      .map((i: number, el: Element) => (el.tagName ?? "").toLowerCase())
      .get(),
  };
}

/**
 * Files content lines into ingredient blocks and instructions with the shared DOM rules (`segmentContent` in @peas/parser), so the importer and the structure validator always agree on where a line was filed.
 */
function parseContentLines(contents: string[]): {
  ingredients: ParsedIngredientLine[];
  instructions: ParsedInstructionLine[];
} {
  const ingredients: ParsedIngredientLine[] = [];
  const instructions: ParsedInstructionLine[] = [];
  for (const block of segmentContent(contents)) {
    if (block.assigned === "INGREDIENT")
      ingredients.push({
        blockIndex: block.blockIndex,
        lineIndex: block.lineIndex,
        reference: block.text,
        parseStatus: "AWAITING_PARSING",
      });
    else
      instructions.push({
        reference: block.text,
        lineIndex: block.lineIndex,
        parseStatus: "AWAITING_PARSING",
      });
  }
  return { ingredients, instructions };
}
