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
    if (line === "") {
      if (currentChunk.length > 0) {
        ingredients.push(currentChunk);
        currentChunk = [];
      }
    } else if (
      line.length > 0 &&
      lineIndex > 0 &&
      contents[lineIndex - 1] === "" &&
      contents[lineIndex + 1] === ""
    ) {
      instructions.push({
        reference: line,
        lineIndex,
        parseStatus: "PENDING",
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
