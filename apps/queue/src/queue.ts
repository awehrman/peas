import { Queue, Worker } from "bullmq";
import { createNote, Note, NoteWithParsedLines } from "@peas/database";
import { load } from "cheerio";
import {
  ParsedHTMLFile,
  ParsedIngredientLine,
  ParsedInstructionLine,
} from "./types";
import { parseISO } from "date-fns";
import { parserQueue } from ".";

const Parser = require("@peas/parser");

export const parseHTML = (note: string): ParsedHTMLFile => {
  const $ = load(note);
  const enNote = $("en-note");
  // get the content from meta itemprop="title"
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

  // get the content from meta itemprop="sourceurl"
  const sourceUrl = $('meta[itemprop="source-url"]').attr("content");

  // TODO grab image

  // grab all the content after the h1
  // this should grab something along the lines of
  /* [
      '<br>',
      '',
      '<br>',
      '1 Whole Wheat Pizza Crust',
      '<br>',
      '1 Yellow Onion, sliced thin',
      'Handful of Fresh Thyme',
      'Handful of Fresh Chives',
      '<br>',
      'Extra Virgin Olive Oil for brushing',
      'Dijon Mustard to Serve',
      '<br>',
      'Heat oven to 500′',
      '<br>',
      'Make the pizza dough ...',
      '<br>',
      'In the meantime, ...',
    ] */
  const contents = enNote
    .find("h1")
    .nextAll()
    .map((i, el) => $(el).html())
    .get();

  // go through our contents array, and sort these string into ingredients vs instructions based on where we see <br> elements
  const ingredients: string[][] = [];
  const instructions: ParsedInstructionLine[] = [];
  let currentChunk: string[] = [];
  let blockIndex = 0;

  contents.forEach((line, lineIndex) => {
    if (line === "<br>") {
      if (currentChunk.length > 0) {
        ingredients.push(currentChunk);
        currentChunk = [];
        blockIndex++;
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
    // image
  };
};

const connection = {
  host: process.env.REDISHOST,
  port: parseInt(process.env.REDISPORT || "6379", 10),
  username: process.env.REDISUSER,
  password: process.env.REDISPASSWORD,
};

export const createQueue = (name: string) => {
  return new Queue(name, {
    connection,
  });
};

const processHTMLFile = async ({ data: { content = "" } }) => {
  console.log("processing file...");
  // cheerio parse meta (name, source, content, image)
  const file = parseHTML(content);
  const noteWithLines = await createNote(file);

  // pass to parsing
  await parserQueue.add("parse-ingredients", {
    note: noteWithLines,
  });
};

export const setupHTMLFileQueueProcessor = (queueName: string) => {
  const worker = new Worker(queueName, processHTMLFile, {
    connection,
  });

  worker.on("completed", (job) => {
    console.log(`Job ${job?.id ?? "unknown"} has been completed`);
  });

  worker.on("failed", (job, err) => {
    console.log(
      `Job ${job?.id ?? "unknown"} has failed with error ${err.message}`
    );
  });
};

const processIngredientLineParsing = async ({
  data: { note },
}: {
  data: { note: NoteWithParsedLines };
}) => {
  console.log("parsing ingredients...");
  const { parsedIngredientLines = [] } = note;
  for (const line of parsedIngredientLines) {
    let message = `${line.reference}`;
    try {
      const parsed = Parser.parse(line.reference, {});
      message += " ✅";
      console.log(JSON.stringify(parsed, null, 2));
    } catch (err) {
      message += " ❌";
    }
    console.log(message);
  }
};

export const setupParsingQueueProcessor = (queueName: string) => {
  const worker = new Worker(queueName, processIngredientLineParsing, {
    connection,
  });

  worker.on("completed", (job) => {
    console.log(`Secondary job ${job.id} completed`);
  });

  worker.on("failed", (job, err) => {
    console.error(
      `Secondary job ${job?.id ?? job} failed with error ${err.message}`
    );
  });
};
