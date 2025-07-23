import { Queue } from "bullmq";

import { redisConfig } from "../config/redis";

export const createQueue = (name: string): Queue => {
  return new Queue(name, { connection: redisConfig });
};
