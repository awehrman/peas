import { serviceContainer } from "../services/container";

// Export the service container's noteQueue
export const noteQueue = serviceContainer.queues.noteQueue;
