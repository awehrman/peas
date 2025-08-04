import { processIngredients } from "./service";

import { ActionName } from "../../../../types";
import type { NotePipelineData } from "../../../../types/notes";
import type { NoteWorkerDependencies } from "../../../../types/notes";
import { BaseAction } from "../../../../workers/core/base-action";
import { ActionContext } from "../../../../workers/core/types";

export class ScheduleIngredientsAction extends BaseAction<
  NotePipelineData,
  NoteWorkerDependencies,
  NotePipelineData
> {
  /** The unique identifier for this action in the worker pipeline */
  name = ActionName.SCHEDULE_INGREDIENT_LINES;

  /**
   * Validate input data before scheduling ingredients
   * @param data The pipeline data to validate
   * @returns Error if validation fails, null if valid
   */
  validateInput(data: NotePipelineData): Error | null {
    if (!data.noteId) {
      return new Error("Note ID is required for scheduling ingredients");
    }
    return null;
  }

  /**
   * Execute the action to schedule ingredient processing jobs
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
      serviceCall: () => processIngredients(data, deps.logger, deps.queues),
      contextName: "SCHEDULE_INGREDIENTS",
      suppressDefaultBroadcast: true,
      startMessage: `Starting to process ingredients for note: ${data.noteId}`,
      // Completion handled via per-ingredient progress events; no final broadcast
      additionalBroadcasting: async () => {
        // Add initial status broadcast showing 0/X ingredients
        if (deps.statusBroadcaster && data.file?.ingredients) {
          await deps.statusBroadcaster.addStatusEventAndBroadcast({
            importId: data.importId || "",
            noteId: data.noteId,
            status: "PENDING",
            message: `Processing 0/${data.file.ingredients.length} ingredients`,
            context: "ingredient_processing",
            currentCount: 0,
            totalCount: data.file.ingredients.length,
            indentLevel: 1,
            metadata: {
              totalIngredients: data.file.ingredients.length,
              currentIngredients: 0,
            },
          });
        }
      },
    });
  }
}

export { processIngredients };
