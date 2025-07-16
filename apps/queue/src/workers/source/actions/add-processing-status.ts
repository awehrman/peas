import { BaseAction } from "../../core/base-action";
import { ActionContext } from "../../core/types";
import { BroadcastProcessingAction } from "../../shared/broadcast-status";

export interface AddProcessingStatusDeps {
  addStatusEventAndBroadcast: (event: {
    noteId: string;
    status: string;
    message: string;
    context: string;
  }) => Promise<void>;
}

export interface AddProcessingStatusData {
  sourceId?: string;
  [key: string]: any;
}

/**
 * Action that adds processing status for source
 */
export class AddProcessingStatusAction extends BaseAction<
  AddProcessingStatusData,
  AddProcessingStatusDeps
> {
  name = "add_processing_status";

  async execute(
    data: AddProcessingStatusData,
    deps: AddProcessingStatusDeps,
    context: ActionContext
  ) {
    const sourceId = data.sourceId || data.source?.id;
    console.log(
      `[${context.operation.toUpperCase()}] Adding processing status for sourceId: ${sourceId}`
    );

    if (!sourceId) {
      console.log(
        `[${context.operation.toUpperCase()}] No sourceId available, skipping processing status`
      );
      return data;
    }

    // Create data with sourceId for the status action
    const statusData = {
      noteId: sourceId,
      message: "Source processing in progress",
    };

    // Create and execute processing status action
    const processingAction = new BroadcastProcessingAction();
    await processingAction.execute(statusData, deps, context);

    return data;
  }
}
