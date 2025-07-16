import { BaseAction } from "../../core/base-action";
import { ActionContext } from "../../core/types";
import { ScheduleInstructionsData, ScheduleInstructionsDeps } from "../types";

export class ScheduleInstructionsAction extends BaseAction<
  ScheduleInstructionsData,
  ScheduleInstructionsDeps
> {
  name = "schedule_instructions";

  async execute(
    data: ScheduleInstructionsData,
    deps: ScheduleInstructionsDeps,
    _context: ActionContext
  ): Promise<ScheduleInstructionsData> {
    await deps.instructionQueue.add("process_instruction_line", {
      noteId: data.noteId,
    });
    return data;
  }
}
