import { createQueue } from "./createQueue";
import { createSourceWorker } from "../workers/source";
import { serviceContainer } from "../services/container";

// Create the source queue
export const sourceQueue = createQueue("sourceQueue");

// Create and start the source worker
createSourceWorker(sourceQueue, serviceContainer);
