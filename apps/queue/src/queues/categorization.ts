import { createQueue } from "./createQueue";
import { setupCategorizationWorker } from "../workers/categorization";

export const categorizationQueue = createQueue("categorizationQueue");
setupCategorizationWorker(categorizationQueue);
