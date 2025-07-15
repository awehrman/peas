import { createQueue } from "./createQueue";
import { createCategorizationWorker } from "../workers/categorization-worker";
import { serviceContainer } from "../services/container";

export const categorizationQueue = createQueue("categorizationQueue");

// Create and start the categorization worker
createCategorizationWorker(categorizationQueue, serviceContainer);
