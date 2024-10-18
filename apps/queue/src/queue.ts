import { Queue, Worker } from "bullmq";
// import { createNote } from "database";

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

export const parseNoteContent = (
  note: NoteWithRelations,
  ingHash: IngredientHash
): ParsedNoteContent => {
  const response = parseHTML(note, ingHash);

  return {
    parsedNote: {
      ...note,
      ingredients: response.ingredients,
      instructions: response.instructions,
    },
    ingHash: { ...response.ingHash },
  };
};

const parseHTMLFile = async (filePath: string, file: string) => {
  console.log(`Parsing HTML file... ${filePath}`);
  console.log({ file });
  // WEHRMAN you left off here
  // we might need to adjust this app's typescript/eslint config or something
  // to pull in the database package properly, currently this is erroring out
  // await createNote({
  //   title: filePath,
  //   content: file,
  // });
};

export const setupQueueProcessor = (queueName: string) => {
  const worker = new Worker(
    queueName,
    async (job) => {
      // Process the job here
      console.log(`Processing job ${job.id} with data:`, job.data);
      await parseHTMLFile(job.data.filePath, job.data.fileContents);
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
