import { BaseAction } from "../core/base-action";
import { ActionContext } from "../core/types";

export interface ScheduleImagesDeps {
  imageQueue: { add: (name: string, data: any) => Promise<any> };
}

export interface ScheduleImagesData {
  note: { id: string };
  file: any; // Replace with actual parsed file type
}

export class ScheduleImagesAction extends BaseAction<
  ScheduleImagesData,
  ScheduleImagesDeps
> {
  name = "schedule_images";

  async execute(
    data: ScheduleImagesData,
    deps: ScheduleImagesDeps,
    _context: ActionContext
  ) {
    console.log(
      `[SCHEDULE_IMAGES] Scheduling image processing for note ${data.note.id}`
    );

    try {
      await deps.imageQueue.add("process_images", {
        noteId: data.note.id,
        file: data.file,
      });
      console.log(
        `[SCHEDULE_IMAGES] Successfully scheduled image job for note ${data.note.id}`
      );
    } catch (error) {
      console.error(`[SCHEDULE_IMAGES] Failed to schedule image job:`, error);
      throw error;
    }

    return data;
  }
}
