import { uploadProcessed } from "./service";

import { ActionName } from "../../../../types";
import { BaseAction } from "../../../../workers/core/base-action";
import type { ActionContext } from "../../../../workers/core/types";
import type {
  ImageJobData,
  ImageWorkerDependencies,
} from "../../../../workers/image/types";

export class UploadProcessedAction extends BaseAction<
  ImageJobData,
  ImageWorkerDependencies,
  ImageJobData
> {
  name = ActionName.UPLOAD_PROCESSED;

  async execute(
    data: ImageJobData,
    deps: ImageWorkerDependencies,
    context: ActionContext
  ): Promise<ImageJobData> {
    return this.executeServiceAction({
      data,
      deps,
      context,
      serviceCall: () =>
        uploadProcessed(data, deps.serviceContainer, deps.logger),
      contextName: "upload_processed",
      startMessage: "Upload processed images started",
      completionMessage: "Upload processed images completed",
      additionalBroadcasting: async (result) => {
        /* istanbul ignore next -- @preserve */
        if (deps.statusBroadcaster) {
          const r = result as unknown as Record<string, unknown>;
          const metadata = {
            r2OriginalUrl: r["r2OriginalUrl"],
            r2ThumbnailUrl: r["r2ThumbnailUrl"],
            r2Crop3x2Url: r["r2Crop3x2Url"],
            r2Crop4x3Url: r["r2Crop4x3Url"],
            r2Crop16x9Url: r["r2Crop16x9Url"],
          };
          deps.logger.log(
            `[UPLOAD_PROCESSED] Broadcasting metadata: ${JSON.stringify(metadata)}`
          );
          deps.logger.log(
            `[UPLOAD_PROCESSED] Result object keys: ${Object.keys(r)}`
          );

          await deps.statusBroadcaster.addStatusEventAndBroadcast({
            importId: data.importId,
            noteId: data.noteId,
            status: "COMPLETED",
            message: "Images processed",
            // Use image_processing so the UI step can pick it up immediately
            context: "image_processing",
            indentLevel: 1,
            metadata,
          });
        }
      },
    });
  }
}
