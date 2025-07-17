import { BaseAction } from "../../core/base-action";
import { ActionContext } from "../../core/types";
import { BroadcastCompletedAction } from "../../shared/broadcast-status";

export interface AddCompletedStatusDeps {
  addStatusEventAndBroadcast: (event: {
    importId: string;
    noteId?: string;
    status: string;
    message: string;
    context: string;
  }) => Promise<void>;
}

export interface AddCompletedStatusData {
  noteId?: string;
  importId?: string;
  sourceId?: string;
  savedSource?: { id: string; [key: string]: unknown };
  [key: string]: unknown;
}

/**
 * Action that adds completed status for source
 */
export class AddCompletedStatusAction extends BaseAction<
  AddCompletedStatusData,
  AddCompletedStatusDeps
> {
  name = "add_completed_status";

  async execute(
    data: AddCompletedStatusData,
    deps: AddCompletedStatusDeps,
    context: ActionContext
  ) {
    const noteId = data.noteId;
    const importId = data.importId;

    console.log(
      `[${context.operation.toUpperCase()}] Adding completed status for noteId: ${noteId}`
    );

    if (!noteId || !importId) {
      console.log(
        `[${context.operation.toUpperCase()}] No noteId or importId available, skipping completed status`
      );
      return data;
    }

    // Create data with noteId for the status action
    const statusData = {
      importId,
      noteId,
      message: "Source processing completed",
    };

    // Create and execute completed status action
    const completedAction = new BroadcastCompletedAction();
    await completedAction.execute(statusData, deps, context);

    return data;
  }
}
