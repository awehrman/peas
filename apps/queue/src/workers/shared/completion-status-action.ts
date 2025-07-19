import { BaseAction } from "../core/base-action";
import { ActionContext } from "../core/types";
import type { BaseWorkerDependencies } from "../types";

/**
 * Base class for completion status actions
 */
export abstract class CompletionStatusAction<TInput> extends BaseAction<
  TInput,
  BaseWorkerDependencies
> {
  abstract name: string;

  protected abstract getCompletionMessage(data: TInput): string;
  protected abstract getCompletionContext(): string;

  async execute(
    data: TInput,
    deps: BaseWorkerDependencies,
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

  protected abstract getImportId(data: TInput): string;
  protected abstract getNoteId(data: TInput): string | undefined;
  protected abstract getCompletionMetadata(
    data: TInput
  ): Record<string, unknown>;
}
