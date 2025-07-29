import type { StructuredLogger } from "../../types";
import { ActionName } from "../../types";
import type {
  NotePipelineData,
  NoteWorkerDependencies,
} from "../../types/notes";
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
 * Clean HTML file by removing style and icons tags.
 *
 * This function processes HTML content by removing unwanted style and icon tags
 * to create cleaner, more focused content. It performs the following operations:
 * 1. Resolves the title from the data or content
 * 2. Removes style tags and their content
 * 3. Removes icon tags and their content
 * 4. Logs detailed cleaning statistics
 *
 * The function preserves the original structure while removing presentation-related
 * elements that are not needed for content processing.
 *
 * @param data - The pipeline data containing the HTML content to clean
 * @param logger - Logger instance for recording cleaning statistics and progress
 * @returns Promise resolving to the updated pipeline data with cleaned content
 *
 * @example
 * ```typescript
 * const result = await cleanHtmlFile(pipelineData, logger);
 * console.log(`Cleaned content length: ${result.content.length}`);
 * ```
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
 * Action class for cleaning HTML content in the worker pipeline.
 *
 * This action removes unwanted style and icon tags from HTML content to create
 * cleaner, more focused content for further processing. It extends BaseAction
 * to provide standardized error handling, logging, and status broadcasting.
 *
 * The action calculates and reports the amount of content removed during cleaning,
 * providing transparency about the cleaning process.
 *
 * @example
 * ```typescript
 * const action = new CleanHtmlAction();
 * const result = await action.execute(pipelineData, dependencies, context);
 * ```
 */
export class CleanHtmlAction extends BaseAction<
  NotePipelineData,
  NoteWorkerDependencies,
  NotePipelineData
> {
  /** The unique identifier for this action in the worker pipeline */
  name = ActionName.CLEAN_HTML;

  /**
   * Executes the HTML cleaning action.
   *
   * This method orchestrates the HTML cleaning process by:
   * 1. Calling the cleanHtml service with proper error handling
   * 2. Broadcasting status updates with cleaning statistics
   * 3. Logging operation progress and content reduction metrics
   *
   * The completion message includes information about the amount of content
   * removed during the cleaning process.
   *
   * @param data - The pipeline data containing the HTML content to clean
   * @param deps - Worker dependencies including services, logger, and status broadcaster
   * @param context - Action context for tracking execution state
   * @returns Promise resolving to the updated pipeline data with cleaned content
   * @throws {Error} When the cleaning operation encounters an error
   *
   * @example
   * ```typescript
   * const result = await action.execute(pipelineData, dependencies, context);
   * console.log(`Cleaned content: ${result.content.length} characters`);
   * ```
   */
  async execute(
    data: NotePipelineData,
    deps: NoteWorkerDependencies,
    context: ActionContext
  ): Promise<NotePipelineData> {
    return this.executeServiceAction({
      data,
      deps,
      context,
      serviceCall: () => deps.services.cleanHtml(data),
      contextName: "clean_html",
      startMessage: "HTML cleaning started",
      completionMessage: `HTML cleaning completed (${calculateRemovedSize(data.content.length, data.content.length)} removed)`,
    });
  }
}
