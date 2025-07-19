import { BaseAction } from "../../core/base-action";
import { ActionContext } from "../../core/types";
import { ScheduleInstructionsDeps } from "../types";
import type { NotePipelineStage3 } from "../types";

export class ScheduleInstructionsAction extends BaseAction<
  NotePipelineStage3,
  ScheduleInstructionsDeps
> {
  name = "schedule_instructions";

  async execute(
    data: NotePipelineStage3,
    deps: ScheduleInstructionsDeps,
    _context: ActionContext
  ): Promise<NotePipelineStage3> {
    const { noteId, importId, note } = data;

    // Extract instruction lines from the note
    const instructionLines = note?.parsedInstructionLines || [];

    // Schedule each instruction line individually with tracking information
    for (let i = 0; i < instructionLines.length; i++) {
      const instructionLine = instructionLines[i];
      if (!instructionLine) continue; // Skip undefined instruction lines

      await deps.instructionQueue.add("process-instruction-line", {
        noteId,
        importId,
        instructionLineId: instructionLine.id,
        originalText: instructionLine.originalText,
        lineIndex: instructionLine.lineIndex,
        currentInstructionIndex: i + 1, // 1-based for display
        totalInstructions: instructionLines.length,
      });
    }

    deps.logger.log(
      `[SCHEDULE_INSTRUCTIONS] Scheduled ${instructionLines.length} instruction jobs for note ${noteId}`
    );

    return data;
  }
}
