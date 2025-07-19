import { BaseAction } from "../../core/base-action";
import { ActionContext } from "../../core/types";

export interface UpdateInstructionCountDeps {
  addStatusEventAndBroadcast: (event: {
    importId: string;
    noteId?: string;
    status: string;
    message: string;
    context: string;
    indentLevel?: number;
    metadata?: Record<string, unknown>;
  }) => Promise<void>;
}

export interface UpdateInstructionCountData {
  importId: string;
  noteId?: string;
  currentInstructionIndex: number;
  totalInstructions: number;
}

export class UpdateInstructionCountAction extends BaseAction<
  UpdateInstructionCountData,
  UpdateInstructionCountDeps
> {
  name = "update_instruction_count";

  async execute(
    data: UpdateInstructionCountData,
    deps: UpdateInstructionCountDeps,
    _context: ActionContext
  ): Promise<UpdateInstructionCountData> {
    // Determine if this is the final instruction
    const isComplete = data.currentInstructionIndex === data.totalInstructions;
    const status = isComplete ? "COMPLETED" : "PROCESSING";
    const emoji = isComplete ? "✅" : "⏳";

    await deps.addStatusEventAndBroadcast({
      importId: data.importId,
      noteId: data.noteId,
      status,
      message: `${emoji} ${data.currentInstructionIndex}/${data.totalInstructions} instructions`,
      context: "parse_html_instructions",
      indentLevel: 2,
      metadata: {
        totalInstructions: data.totalInstructions,
        processedInstructions: data.currentInstructionIndex,
        isComplete,
      },
    });

    return data;
  }
}
