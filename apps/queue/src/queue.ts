import { Queue, Worker } from "bullmq";

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
      console.log(`Processing job ${job.id} with data:`, job.data);
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
