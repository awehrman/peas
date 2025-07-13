import { Queue } from "bullmq";
import { redisConnection } from "../config/redis";

export const createQueue = (name: string): Queue => {
  return new Queue(name, { connection: redisConnection });
};
