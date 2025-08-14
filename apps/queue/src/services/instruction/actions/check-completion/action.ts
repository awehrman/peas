import { ActionName } from "../../../../types";
import { BaseAction } from "../../../../workers/core/base-action";
import type { ActionContext } from "../../../../workers/core/types";
import type {
  InstructionJobData,
  InstructionWorkerDependencies,
} from "../../../../workers/instruction/dependencies";
import { getInstructionCompletionStatus } from "@peas/database";
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
      // Check actual completion status from database
      const completionStatus = await getInstructionCompletionStatus(data.noteId);
      
      deps.logger.log(
        `[CHECK_INSTRUCTION_COMPLETION] Completion status for note ${data.noteId}: ${completionStatus.completedInstructions}/${completionStatus.totalInstructions}`
      );

      // Only mark worker as completed if all instructions are actually completed
      if (completionStatus.isComplete) {
        await markWorkerCompleted(
          data.noteId,
          "instruction",
          deps.logger,
          deps.statusBroadcaster
        );
        deps.logger.log(
          `[CHECK_INSTRUCTION_COMPLETION] All instructions completed for note ${data.noteId}, marked instruction worker as completed`
        );
      } else {
        deps.logger.log(
          `[CHECK_INSTRUCTION_COMPLETION] Not all instructions completed yet for note ${data.noteId}, skipping worker completion`
        );
      }
    } catch (error) {
      deps.logger.log(
        `[CHECK_INSTRUCTION_COMPLETION] Error checking completion: ${error}`
      );
    }

    return data;
  }
}
