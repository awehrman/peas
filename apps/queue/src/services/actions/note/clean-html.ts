import { NotePipelineData, NoteWorkerDependencies } from "./types";

import { BaseAction } from "../../../workers/core/base-action";
import { ActionContext } from "../../../workers/core/types";

/**
 * Action that cleans HTML content by removing style and icons tags
 */
export class CleanHtmlAction extends BaseAction<
  NotePipelineData,
  NoteWorkerDependencies,
  NotePipelineData
> {
  name = "clean_html";

  // Helper to extract title from H1 tag or meta itemprop="title"
  private extractTitle(html: string): string | undefined {
    // First try to find H1 tag
    const h1Match = html.match(/<h1[^>]*>(.*?)<\/h1>/i);
    if (h1Match && h1Match[1]?.trim()) {
      return h1Match[1].trim();
    }

    // Then try to find meta itemprop="title"
    const metaMatch = html.match(
      /<meta[^>]*itemprop="title"[^>]*content="([^"]*)"[^>]*>/i
    );
    if (metaMatch && metaMatch[1]?.trim()) {
      return metaMatch[1].trim();
    }

    return undefined;
  }

  async execute(
    data: NotePipelineData,
    deps: NoteWorkerDependencies,
    context: ActionContext
  ): Promise<NotePipelineData> {
    // Helper function to truncate content to 50 characters
    const truncate = (content: string) =>
      content.length > 50 ? content.slice(0, 50) + "..." : content;

    // Enhanced title resolution
    let title = data.source?.filename || data.source?.url || "Untitled";
    if (!title || title === "Untitled") {
      title = this.extractTitle(data.content) ?? "Untitled";
    }

    // Broadcast start status if we have an importId
    if (data.importId) {
      try {
        await deps.addStatusEventAndBroadcast({
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

    let cleanedContent = data.content;
    const originalLength = cleanedContent.length;

    // Remove style tags and their content
    const beforeStyleRemoval = cleanedContent.length;
    cleanedContent = cleanedContent.replace(
      /<style[^>]*>[\s\S]*?<\/style>/gi,
      ""
    );
    const afterStyleRemoval = cleanedContent.length;
    deps.logger.log(
      `Style tags removed: ${beforeStyleRemoval - afterStyleRemoval} characters`
    );

    // Remove icons tags and their content
    const beforeIconsRemoval = cleanedContent.length;
    cleanedContent = cleanedContent.replace(
      /<icons[^>]*>[\s\S]*?<\/icons>/gi,
      ""
    );
    const afterIconsRemoval = cleanedContent.length;
    deps.logger.log(
      `Icons tags removed: ${beforeIconsRemoval - afterIconsRemoval} characters`
    );

    const totalRemoved = originalLength - cleanedContent.length;
    const removedKB = totalRemoved / 1024;
    const removedMB = totalRemoved / (1024 * 1024);

    // Format size string - show KB if < 1MB, otherwise show MB
    const sizeString =
      removedKB >= 1024
        ? `${removedMB.toFixed(2)}MB`
        : `${removedKB.toFixed(1)}KB`;

    deps.logger.log(`HTML cleaning completed: ${title}`);
    deps.logger.log(
      `Total characters removed: ${totalRemoved} (${sizeString})`
    );
    deps.logger.log(`Final content length: ${cleanedContent.length}`);
    deps.logger.log(`Final content preview: ${truncate(cleanedContent)}`);

    // Broadcast completion status if we have an importId
    if (data.importId) {
      try {
        await deps.addStatusEventAndBroadcast({
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

    return {
      ...data,
      content: cleanedContent,
    };
  }
}
