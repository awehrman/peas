import type { CompletionStatusInput } from "./types";

import { CompletionStatusAction as CoreCompletionStatusAction } from "../../core/completed-status-action";
import type { InstructionWorkerDependencies } from "../types";

/**
 * Instruction-specific completion status action using the generic core implementation.
 */
export class CompletionStatusAction extends CoreCompletionStatusAction<
  CompletionStatusInput,
  InstructionWorkerDependencies
> {}
