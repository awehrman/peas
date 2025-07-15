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
    console.log(
      `[SCHEDULE_INSTRUCTIONS] Scheduling instruction processing for note ${data.note.id}`
    );

    try {
      await deps.instructionQueue.add("process_instructions", {
        noteId: data.note.id,
        file: data.file,
      });
      console.log(
        `[SCHEDULE_INSTRUCTIONS] Successfully scheduled instruction job for note ${data.note.id}`
      );
    } catch (error) {
      console.error(
        `[SCHEDULE_INSTRUCTIONS] Failed to schedule instruction job:`,
        error
      );
      throw error;
    }

    return data;
  }
}
