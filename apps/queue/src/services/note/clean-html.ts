import { ActionName } from "../../types";
import type { StructuredLogger } from "../../types";
import type { NotePipelineData } from "../../types/notes";
import type { NoteWorkerDependencies } from "../../types/notes";
import {
  calculateRemovedSize,
  logCleaningStats,
  removeIconsTags,
  removeStyleTags,
  resolveTitle,
} from "../../utils/html-cleaner";
import { BaseAction } from "../../workers/core/base-action";
import { ActionContext } from "../../workers/core/types";

/**
 * Clean HTML file by removing style and icons tags
 * This is the business logic that can be imported and used elsewhere
 */
export async function cleanHtmlFile(
  data: NotePipelineData,
  logger: StructuredLogger
): Promise<NotePipelineData> {
  const title = resolveTitle(data, data.content);
  const originalLength = data.content.length;

  // Remove style tags and their content
  const beforeStyleRemoval = data.content.length;
  let cleanedContent = removeStyleTags(data.content);
  const afterStyleRemoval = cleanedContent.length;

  // Remove icons tags and their content
  const beforeIconsRemoval = cleanedContent.length;
  cleanedContent = removeIconsTags(cleanedContent);
  const afterIconsRemoval = cleanedContent.length;

  // Log the cleaning statistics
  logCleaningStats(
    logger,
    title,
    originalLength,
    cleanedContent.length,
    beforeStyleRemoval,
    afterStyleRemoval,
    beforeIconsRemoval,
    afterIconsRemoval
  );

  return {
    ...data,
    content: cleanedContent,
  };
}

/**
 * Action that cleans HTML content by removing style and icons tags
 */
export class CleanHtmlAction extends BaseAction<
  NotePipelineData,
  NoteWorkerDependencies,
  NotePipelineData
> {
  name = ActionName.CLEAN_HTML;

  async execute(
    data: NotePipelineData,
    deps: NoteWorkerDependencies,
    context: ActionContext
  ): Promise<NotePipelineData> {
    // Broadcast start status if we have an importId
    if (data.importId && deps.statusBroadcaster) {
      try {
        await deps.statusBroadcaster.addStatusEventAndBroadcast({
          importId: data.importId,
          status: "PROCESSING",
          message: "HTML cleaning started",
          context: "clean_html",
          indentLevel: 1, // Slightly indented for main operations
        });
      } catch (error) {
        console.error(
          `[${context.operation.toUpperCase()}] Failed to broadcast start status:`,
          error
        );
      }
    }

    // Call the cleanHtmlFile service from dependencies
    const result = await deps.services.cleanHtml(data);

    // Broadcast completion status if we have an importId
    if (data.importId && deps.statusBroadcaster) {
      try {
        const originalLength = data.content.length;
        const cleanedLength = result.content.length;
        const sizeString = calculateRemovedSize(originalLength, cleanedLength);

        await deps.statusBroadcaster.addStatusEventAndBroadcast({
          importId: data.importId,
          status: "COMPLETED",
          message: `HTML cleaning completed (${sizeString} removed)`,
          context: "clean_html",
          indentLevel: 1, // Slightly indented for main operations
        });
      } catch (error) {
        console.error(
          `[${context.operation.toUpperCase()}] Failed to broadcast completion status:`,
          error
        );
      }
    }

    return result;
  }
}
