import { BaseAction } from "../core/base-action";
import { ActionContext } from "../core/types";

export interface ScheduleInstructionsDeps {
  instructionQueue: { add: (name: string, data: any) => Promise<any> };
}

export interface ScheduleInstructionsData {
  note: { id: string };
  file: any; // Replace with actual parsed file type
}

export class ScheduleInstructionsAction extends BaseAction<
  ScheduleInstructionsData,
  ScheduleInstructionsDeps
> {
  name = "schedule_instructions";

  async execute(
    data: ScheduleInstructionsData,
    deps: ScheduleInstructionsDeps,
    _context: ActionContext
  ) {
    await deps.instructionQueue.add("process_instructions", {
      noteId: data.note.id,
      file: data.file,
    });
    return data;
  }
}
