import { processImages } from "./service";

import { ActionName } from "../../../../types";
import type { NotePipelineData } from "../../../../types/notes";
import type { NoteWorkerDependencies } from "../../../../types/notes";
import { BaseAction } from "../../../../workers/core/base-action";
import { ActionContext } from "../../../../workers/core/types";

export class ScheduleImagesAction extends BaseAction<
  NotePipelineData,
  NoteWorkerDependencies,
  NotePipelineData
> {
  /** The unique identifier for this action in the worker pipeline */
  name = ActionName.SCHEDULE_IMAGES;

  /**
   * Validate input data before scheduling images
   * @param data The pipeline data to validate
   * @returns Error if validation fails, null if valid
   */
  validateInput(data: NotePipelineData): Error | null {
    if (!data.noteId) {
      return new Error("Note ID is required for scheduling images");
    }
    return null;
  }

  /**
   * Execute the action to schedule image processing jobs
   * @param data The pipeline data containing the note
   * @param deps Dependencies required by the action
   * @param context Context information about the job
   * @returns Promise resolving to the updated pipeline data
   */
  async execute(
    data: NotePipelineData,
    deps: NoteWorkerDependencies,
    context: ActionContext
  ): Promise<NotePipelineData> {
    return this.executeServiceAction({
      data,
      deps,
      context,
      serviceCall: () => processImages(data, deps.logger, deps.queues),
      contextName: "SCHEDULE_IMAGES",
      suppressDefaultBroadcast: true,
      startMessage: `Starting to process images for note: ${data.noteId}`,
      // Completion handled via per-image progress events; no final broadcast
      additionalBroadcasting: async () => {
        /* istanbul ignore next -- @preserve */
        // Add initial status broadcast showing 0/X images
        if (deps.statusBroadcaster && data.file?.images) {
          await deps.statusBroadcaster.addStatusEventAndBroadcast({
            importId: data.importId || "",
            noteId: data.noteId,
            status: "AWAITING_PARSING",
            message: `Processing 0/${data.file.images.length} images`,
            context: "image_processing",
            currentCount: 0,
            totalCount: data.file.images.length,
            indentLevel: 1,
            metadata: {
              totalImages: data.file.images.length,
              currentImages: 0,
            },
          });
        }
      },
    });
  }
}

export { processImages };
