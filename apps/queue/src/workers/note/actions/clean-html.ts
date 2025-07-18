import { BaseAction } from "../../core/base-action";
import { ActionContext } from "../../core/types";

export interface CleanHtmlData {
  content: string;
  importId?: string;
  source?: {
    url?: string;
    filename?: string;
    contentType?: string;
    metadata?: Record<string, unknown>;
  };
  options?: {
    skipParsing?: boolean;
    skipCategorization?: boolean;
    skipImageProcessing?: boolean;
  };
  metadata?: Record<string, unknown>;
  createdAt?: Date;
  priority?: number;
  timeout?: number;
}

export interface CleanHtmlDeps {
  addStatusEventAndBroadcast: (event: {
    importId: string;
    status: string;
    message: string;
    context: string;
  }) => Promise<void>;
}

/**
 * Action that cleans HTML content by removing style and icons tags
 */
export class CleanHtmlAction extends BaseAction<CleanHtmlData, CleanHtmlDeps> {
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
    data: CleanHtmlData,
    deps: CleanHtmlDeps,
    context: ActionContext
  ) {
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
          message: "Cleaning HTML file...",
          context: "clean_html",
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
    console.log(
      `[${context.operation.toUpperCase()}] Style tags removed: ${beforeStyleRemoval - afterStyleRemoval} characters`
    );

    // Remove icons tags and their content
    const beforeIconsRemoval = cleanedContent.length;
    cleanedContent = cleanedContent.replace(
      /<icons[^>]*>[\s\S]*?<\/icons>/gi,
      ""
    );
    const afterIconsRemoval = cleanedContent.length;
    console.log(
      `[${context.operation.toUpperCase()}] Icons tags removed: ${beforeIconsRemoval - afterIconsRemoval} characters`
    );

    const totalRemoved = originalLength - cleanedContent.length;

    console.log(
      `[${context.operation.toUpperCase()}] HTML cleaning completed: ${title}`
    );
    console.log(
      `[${context.operation.toUpperCase()}] Total characters removed: ${totalRemoved}`
    );
    console.log(
      `[${context.operation.toUpperCase()}] Final content length: ${cleanedContent.length}`
    );
    console.log(
      `[${context.operation.toUpperCase()}] Final content preview: ${truncate(cleanedContent)}`
    );

    // Broadcast completion status if we have an importId
    if (data.importId) {
      try {
        await deps.addStatusEventAndBroadcast({
          importId: data.importId,
          status: "COMPLETED",
          message: "HTML cleaning completed",
          context: "clean_html",
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
