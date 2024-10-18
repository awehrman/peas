import { Queue, Worker } from "bullmq";
// import { createNote } from "database";
import { load } from "cheerio";

export const parseHTML = (note: string): void => {
  const $ = load(note);
  const enNote = $("en-note");
  // get the content from meta itemprop="title"
  const title = $('meta[itemprop="title"]').attr("content");
  console.log("Title:", title);

  // get the content from meta itemprop="sourceurl"
  const sourceUrl = $('meta[itemprop="source-url"]').attr("content");
  console.log("Source URL:", sourceUrl);

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
      '1/2 tbsp. Butter',
      '1 Medium Apple (Honeycrisp, Fuji or anything crispy)',
      '1 Cup Diced Smoked Mozzarella Cheese',
      '1 Cup Shredded Parmesan Cheese',
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
      '<br>',
      'Seed and cut the apple ...',
      '<br>',
      'Roll out the dough ...',
      '<br>',
      'Pile your toppings ...',
      '<br>',
      'Brush the top of ...',
      '<br>'
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

  // Add any remaining chunk to ingredients
  if (currentChunk.length > 0) {
    ingredients.push(currentChunk);
  }

  console.log("Ingredients:", ingredients);
  console.log("Instructions:", instructions);
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
  parseHTML(content);
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
