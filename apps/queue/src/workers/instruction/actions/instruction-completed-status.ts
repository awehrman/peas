import { BaseAction } from "../../core/base-action";
import { ActionContext } from "../../core/types";

export interface InstructionCompletedStatusDeps {
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

export interface InstructionCompletedStatusData {
  // Original job data
  noteId: string;
  instructionLineId: string;
  originalText: string;
  lineIndex: number;
  importId?: string;
  currentInstructionIndex?: number;
  totalInstructions?: number;
  options?: {
    normalizeText?: boolean;
    extractTiming?: boolean;
  };
  // Data from previous actions in pipeline
  parseStatus?: string;
  success?: boolean;
  stepsSaved?: number;
}

export class InstructionCompletedStatusAction extends BaseAction<
  InstructionCompletedStatusData,
  InstructionCompletedStatusDeps
> {
  name = "instruction_completed_status";

  async execute(
    data: InstructionCompletedStatusData,
    deps: InstructionCompletedStatusDeps,
    _context: ActionContext
  ): Promise<InstructionCompletedStatusData> {
    // Only broadcast if we have tracking information
    if (
      !data.importId ||
      typeof data.currentInstructionIndex !== "number" ||
      typeof data.totalInstructions !== "number"
    ) {
      return data;
    }

    // Use the same context as the initial count so frontend can update the existing line
    // Change status to indicate progress and use a different emoji
    const status =
      data.currentInstructionIndex === data.totalInstructions
        ? "COMPLETED"
        : "PROCESSING";
    const emoji =
      data.currentInstructionIndex === data.totalInstructions ? "✅" : "⏳";

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
        instructionLineId: data.instructionLineId,
        parseStatus: data.parseStatus || "UNKNOWN",
        isComplete: data.currentInstructionIndex === data.totalInstructions,
      },
    });

    return data;
  }
}
