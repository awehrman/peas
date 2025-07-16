import { createQueue } from "./createQueue";
import { createCategorizationWorker } from "../workers/categorization";
import { serviceContainer } from "../services/container";

export const categorizationQueue = createQueue("categorizationQueue");

// Create and start the categorization worker
createCategorizationWorker(categorizationQueue, serviceContainer);
