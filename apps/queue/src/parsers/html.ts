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
  const title = $('meta[itemprop="title"]').attr("content");

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

  const contents = enNote
    .find("h1")
    .nextAll()
    .map((i, el) => $(el).html())
    .get();

  const ingredients: string[][] = [];
  const instructions: ParsedInstructionLine[] = [];
  let currentChunk: string[] = [];

  contents.forEach((line, lineIndex) => {
    if (line === "<br>") {
      if (currentChunk.length > 0) {
        ingredients.push(currentChunk);
        currentChunk = [];
      }
    } else if (
      line.length > 0 &&
      lineIndex > 0 &&
      contents[lineIndex - 1] === "<br>" &&
      contents[lineIndex + 1] === "<br>"
    ) {
      instructions.push({
        reference: line,
        lineIndex,
      });
    } else if (line.length > 0) {
      currentChunk.push(line);
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
      }))
  );

  const contentsString = contents.join("\n");

  console.log(`Finished parsing "${title}."`);

  return {
    title,
    historicalCreatedAt,
    sourceUrl,
    ingredients: parsedIngredients,
    instructions,
    contents: contentsString,
  };
}
