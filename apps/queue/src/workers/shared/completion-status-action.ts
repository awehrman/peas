import { ActionName } from "../../types";
import { BaseAction } from "../core/base-action";
import { ActionContext } from "../core/types";
import type { BaseJobData } from "../types";

/**
 * Base class for completion status actions.
 * @template TInput - The input data type
 */
export interface StatusBroadcasterDeps {
  addStatusEventAndBroadcast: (
    event: Record<string, unknown>
  ) => Promise<unknown>;
}

export abstract class CompletionStatusAction<
  TInput extends BaseJobData = BaseJobData,
  TDeps extends StatusBroadcasterDeps = StatusBroadcasterDeps,
> extends BaseAction<TInput, TDeps> {
  /**
   * The name of the action.
   */
  abstract name: ActionName;

  /**
   * Get the completion message for the status event.
   * @param data - Input data
   * @returns Completion message string
   */
  protected abstract getCompletionMessage(data: TInput): string;

  /**
   * Get the context for the completion status event.
   * @returns Completion context string
   */
  protected abstract getCompletionContext(): string;

  /**
   * Execute the completion status action.
   * @param data - Input data
   * @param deps - Worker dependencies
   * @param _context - Action context
   * @returns The input data
   */
  async execute(
    data: TInput,
    deps: TDeps,
    _context: ActionContext
  ): Promise<TInput> {
    const message = this.getCompletionMessage(data);
    const context = this.getCompletionContext();
    await deps.addStatusEventAndBroadcast({
      importId: this.getImportId(data),
      noteId: this.getNoteId(data),
      status: "COMPLETED",
      message,
      context,
      indentLevel: 0,
      metadata: this.getCompletionMetadata(data),
    });
    return data;
  }

  /**
   * Get the import ID from the input data.
   * @param data - Input data
   * @returns Import ID string
   */
  protected abstract getImportId(data: TInput): string;

  /**
   * Get the note ID from the input data.
   * @param data - Input data
   * @returns Note ID string or undefined
   */
  protected abstract getNoteId(data: TInput): string | undefined;

  /**
   * Get completion metadata from the input data.
   * @param data - Input data
   * @returns Metadata object
   */
  protected abstract getCompletionMetadata(
    data: TInput
  ): Record<string, unknown>;
}
