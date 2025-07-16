import { serviceContainer } from "../services/container";

// Export the service container's instructionQueue
export const instructionQueue = serviceContainer.queues.instructionQueue;
