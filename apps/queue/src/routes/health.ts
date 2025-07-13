import { Router } from "express";
import fs from "fs";
import path from "path";
import { htmlNoteQueue, parserQueue } from "../queues";

export const healthRouter = Router();

const directoryPath = path.join(process.cwd(), "/public/files");

healthRouter.get("/", async (_req, res) => {
  res.json({
    queues: {
      htmlNote: htmlNoteQueue.name,
      parser: parserQueue.name,
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
