import { Queue, Worker } from "bullmq";
import { createNote, Note } from "database";
import { load } from "cheerio";
import { ParsedHTMLFile } from "./types";

export const parseHTML = (note: string): ParsedHTMLFile => {
  const $ = load(note);
  const enNote = $("en-note");
  // get the content from meta itemprop="title"
  const title = $('meta[itemprop="title"]').attr("content");
  if (title === undefined) {
    throw new Error("This file doesn't have a title!");
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
  const instructions: string[] = [];
  let currentChunk: string[] = [];

  contents.forEach((line, index) => {
    if (line === "<br>") {
      if (currentChunk.length > 0) {
        ingredients.push(currentChunk);
        currentChunk = [];
      }
    } else if (
      line.length > 0 &&
      index > 0 &&
      contents[index - 1] === "<br>" &&
      contents[index + 1] === "<br>"
    ) {
      instructions.push(line);
    } else if (line.length > 0) {
      currentChunk.push(line);
    }
  });

  if (currentChunk.length > 0) {
    ingredients.push(currentChunk);
  }

  const contentsString = contents.join("\n");

  console.log(`Finished parsing "${title}."`);

  return {
    title,
    sourceUrl,
    ingredients,
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
  await createNote(file);
  // lookup existing note based on name + source
  // save note with base info
  // ? should the parser be a separate process?
  // that basically queues up and processes anything in need of parsing?
  // parse note content and re-save with ing/ins
  // parse ing lines
};

export const setupQueueProcessor = (queueName: string) => {
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
