import { Router } from "express";
import { noteQueue, ingredientQueue } from "../queues";
import { performanceTracker } from "../utils/performance";

export const healthRouter = Router();

healthRouter.get("/", (req, res) => {
  res.json({
    queues: {
      note: noteQueue.name,
      ingredient: ingredientQueue.name,
    },
    // redis: {
    //   connected: true, // TODO: Add actual Redis health check
    // },
    performance: {
      averageProcessingTimes: {
        note: performanceTracker.getAverageDuration("note-processing"),
        ingredient: performanceTracker.getAverageDuration("ingredient-parsing"),
        instruction: performanceTracker.getAverageDuration(
          "instruction-parsing"
        ),
        image: performanceTracker.getAverageDuration("image-processing"),
        categorization: performanceTracker.getAverageDuration("categorization"),
      },
    },
    uptime: process.uptime(),
    memory: process.memoryUsage(),
  });
});
