import { createQueue } from "./createQueue";
import { createImageWorker } from "../workers/image";
import { serviceContainer } from "../services/container";

export const imageQueue = createQueue("imageQueue");

// Create and start the image worker
createImageWorker(imageQueue, serviceContainer);
