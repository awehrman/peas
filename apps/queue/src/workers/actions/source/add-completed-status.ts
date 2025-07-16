import { BaseAction } from "../core/base-action";
import { ActionContext } from "../core/types";
import { BroadcastCompletedAction } from "../../shared/broadcast-status";

export interface AddCompletedStatusDeps {
  addStatusEventAndBroadcast: (event: {
    noteId: string;
    status: string;
    message: string;
    context: string;
  }) => Promise<void>;
}

export interface AddCompletedStatusData {
  sourceId?: string;
  [key: string]: any;
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
    const sourceId = data.sourceId || data.savedSource?.id;
    console.log(
      `[${context.operation.toUpperCase()}] Adding completed status for sourceId: ${sourceId}`
    );

    if (!sourceId) {
      console.log(
        `[${context.operation.toUpperCase()}] No sourceId available, skipping completed status`
      );
      return data;
    }

    // Create data with sourceId for the status action
    const statusData = {
      noteId: sourceId,
      message: "Source processing completed",
    };

    // Create and execute completed status action
    const completedAction = new BroadcastCompletedAction();
    await completedAction.execute(statusData, deps, context);

    return data;
  }
}
