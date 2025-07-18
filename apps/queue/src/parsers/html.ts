import { load } from "cheerio";
import { parseISO } from "date-fns";
import {
  ParsedHTMLFile,
  ParsedIngredientLine,
  ParsedInstructionLine,
} from "../types";

export function parseHTML(note: string): ParsedHTMLFile {
  const $ = load(note);
  const enNote = $("en-note");
  const metaTitle = $('meta[itemprop="title"]').attr("content");
  const h1 = enNote.find("h1");

  let title: string | undefined;
  let contents: string[];

  if (h1.length > 0) {
    title = h1.text().trim();
    contents = h1
      .nextAll()
      .map((i, el) => $(el).html())
      .get();
  } else {
    title = metaTitle;
    contents = enNote
      .children()
      .map((i, el) => $(el).html())
      .get();
  }

  if (title === undefined) {
    throw new Error("This file doesn't have a title!");
  }

  const historicalCreatedAtString = $('meta[itemprop="created"]').attr(
    "content"
  );
  let historicalCreatedAt: Date | undefined;

  if (historicalCreatedAtString) {
    historicalCreatedAt = parseISO(historicalCreatedAtString);
    if (isNaN(historicalCreatedAt.getTime())) {
      throw new Error("Invalid date format in 'created' meta tag");
    }
  }

  const sourceUrl = $('meta[itemprop="source-url"]').attr("content");

  const ingredients: string[][] = [];
  const instructions: ParsedInstructionLine[] = [];
  let currentChunk: string[] = [];

  contents.forEach((line, lineIndex) => {
    if (line === "" || line.includes("<br")) {
      // End current ingredient block if we have one
      if (currentChunk.length > 0) {
        ingredients.push(currentChunk);
        currentChunk = [];
      }
    } else if (line.length > 0) {
      // Check if this line is surrounded by empty lines or <br> tags (instruction)
      const prevLine = lineIndex > 0 ? contents[lineIndex - 1] || "" : "";
      const nextLine =
        lineIndex < contents.length - 1 ? contents[lineIndex + 1] || "" : "";
      const isPrevEmpty = prevLine === "" || prevLine.includes("<br");
      const isNextEmpty = nextLine === "" || nextLine.includes("<br");

      if (isPrevEmpty && isNextEmpty) {
        // Single line surrounded by empty lines - this is an instruction
        // Strip HTML tags for clean text
        const cleanText = line.replace(/<[^>]*>/g, "").trim();
        if (cleanText) {
          instructions.push({
            reference: cleanText,
            lineIndex,
            parseStatus: "PENDING",
          });
        }
      } else {
        // Line is part of a block - this is an ingredient
        // Strip HTML tags for clean text
        const cleanText = line.replace(/<[^>]*>/g, "").trim();
        if (cleanText) {
          currentChunk.push(cleanText);
        }
      }
    }
  });

  if (currentChunk.length > 0) {
    ingredients.push(currentChunk);
  }

  const parsedIngredients: ParsedIngredientLine[] = ingredients.flatMap(
    (block, blockIndex) =>
      block.map((line, lineIndex) => ({
        blockIndex,
        lineIndex,
        reference: line,
        parseStatus: "PENDING",
      }))
  );

  const contentsString = contents.join("\n");

  return {
    title,
    historicalCreatedAt,
    sourceUrl,
    ingredients: parsedIngredients,
    instructions,
    contents: contentsString,
  };
}
