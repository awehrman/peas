import { createQueue } from "./createQueue";
import { createInstructionWorker } from "../workers/instruction-worker";
import { serviceContainer } from "../services/container";

export const instructionQueue = createQueue("instructionQueue");

// Create and start the instruction worker
createInstructionWorker(instructionQueue, serviceContainer);
