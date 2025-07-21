import { serviceContainer } from "../services/container";
import type {
  TypedQueue,
  InstructionJobData,
  InstructionActionName,
} from "../types";

export const instructionQueue: TypedQueue<
  InstructionJobData,
  InstructionActionName
> = serviceContainer.queues.instructionQueue as TypedQueue<
  InstructionJobData,
  InstructionActionName
>;
