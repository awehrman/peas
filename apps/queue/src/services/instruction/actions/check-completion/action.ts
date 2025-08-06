import { ActionName } from "../../../../types";
import { BaseAction } from "../../../../workers/core/base-action";
import type { ActionContext } from "../../../../workers/core/types";
import type {
  InstructionJobData,
  InstructionWorkerDependencies,
} from "../../../../workers/instruction/dependencies";
import { markWorkerCompleted } from "../../../note/actions/track-completion/service";

export class CheckInstructionCompletionAction extends BaseAction<
  InstructionJobData,
  InstructionWorkerDependencies,
  InstructionJobData
> {
  public readonly name = ActionName.CHECK_INSTRUCTION_COMPLETION;

  public async execute(
    data: InstructionJobData,
    deps: InstructionWorkerDependencies,
    _context: ActionContext
  ): Promise<InstructionJobData> {
    if (!data.noteId) {
      deps.logger.log(
        `[CHECK_INSTRUCTION_COMPLETION] No note ID available, skipping completion check`
      );
      return data;
    }

    try {
      // Mark the instruction worker as completed for this note
      // This action should be called when all instruction jobs for a note are finished
      markWorkerCompleted(
        data.noteId,
        "instruction",
        deps.logger,
        deps.statusBroadcaster
      );
      deps.logger.log(
        `[CHECK_INSTRUCTION_COMPLETION] Marked instruction worker as completed for note ${data.noteId}`
      );
    } catch (error) {
      deps.logger.log(
        `[CHECK_INSTRUCTION_COMPLETION] Error marking completion: ${error}`
      );
    }

    return data;
  }
}
