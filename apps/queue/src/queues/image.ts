import { createQueue } from "./createQueue";
import { setupImageWorker } from "../workers/image";

export const imageQueue = createQueue("imageQueue");
setupImageWorker(imageQueue);
