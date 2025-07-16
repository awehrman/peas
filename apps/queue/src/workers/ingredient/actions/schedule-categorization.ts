import { BaseAction } from "../../core/base-action";
import { ActionContext } from "../../core/types";

export interface ScheduleCategorizationInput {
  noteId: string;
  ingredientLineId: string;
  parseResult: {
    success: boolean;
    parseStatus: string;
  };
}

export interface ScheduleCategorizationOutput {
  success: boolean;
  categorizationJobId?: string;
}

export class ScheduleCategorizationAction extends BaseAction<
  ScheduleCategorizationInput,
  {
    categorizationQueue: {
      add: (name: string, data: Record<string, unknown>) => Promise<unknown>;
    };
  }
> {
  name = "schedule_categorization";

  async execute(
    input: ScheduleCategorizationInput,
    deps: {
      categorizationQueue: {
        add: (name: string, data: Record<string, unknown>) => Promise<unknown>;
      };
    },
    context: ActionContext
  ): Promise<ScheduleCategorizationOutput> {
    try {
      const { noteId } = input;

      // Schedule categorization job
      const job = await deps.categorizationQueue.add("process_categorization", {
        noteId,
        triggeredBy: "ingredient_processing",
        sourceJobId: context.jobId,
      });

      console.log(
        `[${context.operation}] Scheduled categorization for note ${noteId} (job: ${(job as { id: string }).id})`
      );

      return {
        success: true,
        categorizationJobId: (job as { id: string }).id,
      };
    } catch (error) {
      console.error(
        `[${context.operation}] Failed to schedule categorization for note ${input.noteId}:`,
        error
      );
      throw new Error(`Failed to schedule categorization: ${error}`);
    }
  }

  retryable = true;
}
