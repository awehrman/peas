import { createQueue } from "./createQueue";
import { createSourceWorker } from "../workers/source-worker";
import { serviceContainer } from "../services/container";

// Create the source queue
export const sourceQueue = createQueue("source");

// Create and start the source worker
createSourceWorker(sourceQueue, serviceContainer);
