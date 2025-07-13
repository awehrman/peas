import { Router } from "express";
import fs from "fs";
import path from "path";
import { noteQueue, ingredientQueue } from "../queues";

export const healthRouter = Router();

const directoryPath = path.join(process.cwd(), "/public/files");

healthRouter.get("/", async (_req, res) => {
  res.json({
    queues: {
      note: noteQueue.name,
      ingredient: ingredientQueue.name,
    },
    redis: {
      host: process.env.REDISHOST,
      port: process.env.REDISPORT,
    },
    directory: {
      path: directoryPath,
      exists: fs.existsSync(directoryPath),
      files: fs.existsSync(directoryPath) ? fs.readdirSync(directoryPath) : [],
    },
  });
});
