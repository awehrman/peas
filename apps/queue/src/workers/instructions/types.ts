import { Queue } from "bullmq";
import { parseHTML } from "../../parsers/html";
import { createNote } from "@peas/database";
import { addStatusEventAndBroadcast } from "../../utils/status-broadcaster";
import { ErrorHandler } from "../../utils/error-handler";
import { HealthMonitor } from "../../utils/health-monitor";

export interface InstructionWorkerDependencies {
  parseHTML: typeof parseHTML;
  createNote: typeof createNote;
  addStatusEventAndBroadcast: typeof addStatusEventAndBroadcast;
  ErrorHandler: typeof ErrorHandler;
  HealthMonitor: typeof HealthMonitor;
  ingredientQueue: Queue;
  instructionQueue: Queue;
  imageQueue: Queue;
  categorizationQueue: Queue;
  logger?: {
    log: (message: string) => void;
    error: (message: string, error?: Error) => void;
  };
}
