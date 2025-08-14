import { saveTags } from "./service";

import { ActionName } from "../../../../types";
import type { CategorizationJobData } from "../../../../workers/categorization/dependencies";
import type { CategorizationWorkerDependencies } from "../../../../workers/categorization/dependencies";
import { BaseAction } from "../../../../workers/core/base-action";
import type { ActionContext } from "../../../../workers/core/types";

export class SaveTagsAction extends BaseAction<
  CategorizationJobData,
  CategorizationWorkerDependencies,
  CategorizationJobData
> {
  name = ActionName.SAVE_TAGS;

  validateInput(data: CategorizationJobData): Error | null {
    if (!data.noteId) {
      return new Error("Note ID is required for tag saving");
    }
    return null;
  }

  async execute(
    data: CategorizationJobData,
    deps: CategorizationWorkerDependencies,
    context: ActionContext
  ): Promise<CategorizationJobData> {
    // Validate input before processing
    const validationError = this.validateInput(data);
    if (validationError) {
      throw validationError;
    }

    // Call the service to save tags using executeServiceAction for status broadcasting
    return this.executeServiceAction({
      data,
      deps,
      context,
      serviceCall: () => saveTags(data, deps.logger, deps.statusBroadcaster),
      contextName: "tag_save",
      startMessage: "Saving recipe tags...",
      completionMessage: "Tags saved: chocolate, dessert, sweet",
      additionalBroadcasting: async (result) => {
        if (deps.statusBroadcaster) {
          const tags = result.metadata?.determinedTags as string[] | undefined;
          const message = tags && tags.length > 0 ? `Tags saved: ${tags.join(", ")}` : "No tags to save";
          await deps.statusBroadcaster.addStatusEventAndBroadcast({
            importId: data.importId,
            status: "COMPLETED",
            message,
            context: "tag_save_complete",
            noteId: data.noteId,
            indentLevel: 1,
            metadata: {
              savedTags: tags,
            },
          });
        }
      },
    });
  }
}
