import { Queue, Worker } from "bullmq";
// import { createNote } from "database";
import { load } from "cheerio";
import { Blocks, IngredientLine, InstructionLine } from "./types";

export const parseHTML = (note: string): void => {
  let ingredients: IngredientLine[] = [];
  let instructions: InstructionLine[] = [];
  // load our string dom content into a cheerio object
  // this will allow us to easily traverse the DOM tree
  const $ = load(note ?? "");
  const enNote = $("en-note");
  const firstNonEmptyLine = enNote
    .find("div")
    .filter((i, element) => $(element).text().trim() !== "")
    .first();

  const children = firstNonEmptyLine.parent().children("div");
  const blocks: Blocks = []; // [[{}, {}, {}], [{}], [{}], [{}]]

  // split the children into groups based on spacing
  children.each((index) => {
    const element = children[index];
    const line = element?.children?.[0] ?? "";
    console.log({ line });
  });
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

export const setupQueueProcessor = (queueName: string) => {
  const worker = new Worker(
    queueName,
    async (job) => {
      // Process the job here
      console.log(`Processing job ${job.data.filePath}`);
      // await createNote({ title: job.data.filePath, content: job.data });
      // await parseHTML(job.data.fileContents);
      // saveNote();
      // removeFile();
    },
    {
      connection,
    }
  );

  worker.on("completed", (job) => {
    console.log(`Job ${job?.id ?? "unknown"} has been completed`);
  });

  worker.on("failed", (job, err) => {
    console.log(
      `Job ${job?.id ?? "unknown"} has failed with error ${err.message}`
    );
  });
};
