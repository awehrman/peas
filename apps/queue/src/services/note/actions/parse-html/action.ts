import { ParseHtmlDataSchema } from "../../../../schemas/note";
import { ActionName } from "../../../../types";
import type {
  NotePipelineData,
  NoteWorkerDependencies,
} from "../../../../types/notes";
import { BaseAction } from "../../../../workers/core/base-action";
import { ActionContext } from "../../../../workers/core/types";
import { parseHtmlFile } from "./service";

export class ParseHtmlAction extends BaseAction<
  NotePipelineData,
  NoteWorkerDependencies,
  NotePipelineData
> {
  name = ActionName.PARSE_HTML;
  private schema = ParseHtmlDataSchema;

  validateInput(data: NotePipelineData): Error | null {
    try {
      this.schema.parse(data);
      return null;
    } catch (error) {
      return error instanceof Error ? error : new Error(String(error));
    }
  }

  async execute(
    data: NotePipelineData,
    deps: NoteWorkerDependencies,
    context: ActionContext
  ): Promise<NotePipelineData> {
    return this.executeServiceAction({
      data,
      deps,
      context,
      serviceCall: () => deps.services.parseHtml(data),
      contextName: "parse_html_start",
      startMessage: "Parsing HTML",
      completionMessage: "Finished parsing HTML file.",
      additionalBroadcasting: async (result) => {
        if (data.importId && deps.statusBroadcaster && result.file) {
          // Send completion message with correct context and metadata
          await deps.statusBroadcaster.addStatusEventAndBroadcast({
            importId: data.importId,
            status: "COMPLETED",
            message: "Finished parsing HTML file.",
            context: "parse_html_complete",
            indentLevel: 1,
            metadata: {
              noteTitle: result.file.title,
            },
          });

          // Broadcast ingredient count status
          await deps.statusBroadcaster.addStatusEventAndBroadcast({
            importId: data.importId,
            status: "PENDING",
            message: `0/${result.file.ingredients?.length || 0} ingredients`,
            context: "parse_html_ingredients",
            indentLevel: 2,
            metadata: {
              totalIngredients: result.file.ingredients?.length || 0,
              processedIngredients: 0,
            },
          });

          // Broadcast instruction count status
          await deps.statusBroadcaster.addStatusEventAndBroadcast({
            importId: data.importId,
            status: "PENDING",
            message: `0/${result.file.instructions?.length || 0} instructions`,
            context: "parse_html_instructions",
            indentLevel: 2,
            metadata: {
              totalInstructions: result.file.instructions?.length || 0,
              processedInstructions: 0,
            },
          });
        }
      },
    });
  }
}

export { parseHtmlFile };
