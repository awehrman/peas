import { serviceContainer } from "../services/container";

// Export the service container's imageQueue
export const imageQueue = serviceContainer.queues.imageQueue;
