import { BaseAction } from "../../core/base-action";
import { ActionContext } from "../../core/types";
import {
  BroadcastProcessingAction,
  BroadcastCompletedAction,
} from "../../shared/broadcast-status";

export interface AddStatusActionsDeps {
  addStatusEventAndBroadcast: (event: {
    importId: string;
    noteId?: string;
    status: string;
    message: string;
    context: string;
  }) => Promise<void>;
}

export interface AddStatusActionsData {
  note?: {
    id: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

/**
 * Action that adds status broadcasting actions after the note is created
 */
export class AddStatusActionsAction extends BaseAction<
  AddStatusActionsData,
  AddStatusActionsDeps
> {
  name = "add_status_actions";

  async execute(
    data: AddStatusActionsData,
    deps: AddStatusActionsDeps,
    context: ActionContext
  ) {
    const noteId = data.note?.id;
    console.log(
      `[${context.operation.toUpperCase()}] Adding status actions for noteId: ${noteId}`
    );

    if (!noteId) {
      console.log(
        `[${context.operation.toUpperCase()}] No noteId available, skipping status actions`
      );
      return data;
    }

    // Create data with noteId for the status actions
    const statusData = {
      importId: noteId,
      noteId,
      message: "Processing completed",
    };

    // Create and execute processing status action
    const processingAction = new BroadcastProcessingAction();
    await processingAction.execute(statusData, deps, context);

    // Create and execute completed status action
    const completedAction = new BroadcastCompletedAction();
    await completedAction.execute(statusData, deps, context);

    return data;
  }
}
