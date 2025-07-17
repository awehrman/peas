import { BaseAction } from "../../core/base-action";
import { ActionContext } from "../../core/types";
import { BroadcastProcessingAction } from "../../shared/broadcast-status";

export interface AddProcessingStatusDeps {
  addStatusEventAndBroadcast: (event: {
    importId: string;
    noteId?: string;
    status: string;
    message: string;
    context: string;
  }) => Promise<void>;
}

export interface AddProcessingStatusData {
  noteId?: string;
  importId?: string;
  sourceId?: string;
  source?: { id: string; [key: string]: unknown };
  [key: string]: unknown;
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
    const noteId = data.noteId;
    const importId = data.importId;

    console.log(
      `[${context.operation.toUpperCase()}] Adding processing status for noteId: ${noteId}`
    );

    if (!noteId || !importId) {
      console.log(
        `[${context.operation.toUpperCase()}] No noteId or importId available, skipping processing status`
      );
      return data;
    }

    // Create data with noteId for the status action
    const statusData = {
      importId,
      noteId,
      message: "Source processing in progress",
    };

    // Create and execute processing status action
    const processingAction = new BroadcastProcessingAction();
    await processingAction.execute(statusData, deps, context);

    return data;
  }
}
