import { BaseAction } from "../../core/base-action";
import { ActionContext } from "../../core/types";
import { ScheduleImagesDeps } from "../types";
import { type ScheduleImagesData } from "../schema";

export class ScheduleImagesAction extends BaseAction<
  ScheduleImagesData,
  ScheduleImagesDeps
> {
  name = "schedule_images";

  async execute(
    data: ScheduleImagesData,
    deps: ScheduleImagesDeps,
    _context: ActionContext
  ): Promise<ScheduleImagesData> {
    await deps.imageQueue.add("process-image", {
      noteId: data.noteId,
    });
    return data;
  }
}
