import { BaseAction } from "../../core/base-action";
import { ActionContext } from "../../core/types";
import { ScheduleInstructionsDeps } from "../types";
import { type ScheduleInstructionsData } from "../schema";

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
    await deps.instructionQueue.add("process-instruction-line", {
      noteId: data.noteId,
    });
    return data;
  }
}
