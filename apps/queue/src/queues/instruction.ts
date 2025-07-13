import { createQueue } from "./createQueue";
import { setupInstructionWorker } from "../workers/instruction";

export const instructionQueue = createQueue("instructionQueue");
setupInstructionWorker(instructionQueue);
