import { Router } from "express";

import { performanceTracker } from "../utils/performance";

export const healthRouter = Router();

healthRouter.get("/", (req, res) => {
  res.json({
    queues: {
      note: "note_processing",
      // TODO: Add back other queues as needed
      // ingredient: "ingredient_processing",
    },
    // redis: {
    //   connected: true, // TODO: Add actual Redis health check
    // },
    performance: {
      averageProcessingTimes: {
        note: performanceTracker.getAverageDuration("note-processing"),
        // TODO: Add back other performance metrics as needed
        // ingredient: performanceTracker.getAverageDuration("ingredient-parsing"),
        // instruction: performanceTracker.getAverageDuration("instruction-parsing"),
        // image: performanceTracker.getAverageDuration("image-processing"),
        // categorization: performanceTracker.getAverageDuration("categorization"),
      },
    },
    uptime: process.uptime(),
    memory: process.memoryUsage(),
  });
});
