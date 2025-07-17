import { BaseAction } from "../../core/base-action";
import { ActionContext } from "../../core/types";

export interface CleanHtmlData {
  file: {
    content: string;
    title?: string;
    metadata?: { title?: string; [key: string]: unknown };
    [key: string]: unknown;
  };
  noteId?: string;
}

export interface CleanHtmlDeps {
  addStatusEventAndBroadcast: (event: {
    noteId: string;
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

  // Helper to extract first <h1> text from HTML
  private extractH1(html: string): string | undefined {
    const match = html.match(/<h1[^>]*>(.*?)<\/h1>/i);
    return match ? match[1].trim() : undefined;
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
    let title = data.file.title;
    const metadata = data.file.metadata ?? {};
    if (!title && typeof metadata.title === "string") {
      title = metadata.title;
    }
    if (!title) {
      title = this.extractH1(data.file.content);
    }
    if (!title) {
      title = "Untitled";
    }

    const truncatedContent = truncate(data.file.content);

    console.log(`[${context.operation.toUpperCase()}] Cleaning HTML: ${title}`);

    // Broadcast start status if we have a noteId
    if (data.noteId) {
      await deps.addStatusEventAndBroadcast({
        noteId: data.noteId,
        status: "PROCESSING",
        message: `HTML cleaning started: ${truncatedContent}`,
        context: "clean_html",
      });
    }

    let cleanedContent = data.file.content;

    // Remove style tags and their content
    cleanedContent = cleanedContent.replace(
      /<style[^>]*>[\s\S]*?<\/style>/gi,
      ""
    );

    // Remove icons tags and their content
    cleanedContent = cleanedContent.replace(
      /<icons[^>]*>[\s\S]*?<\/icons>/gi,
      ""
    );

    const truncatedCleanedContent = truncate(cleanedContent);

    console.log(
      `[${context.operation.toUpperCase()}] HTML cleaning completed: ${title}`
    );

    // Broadcast completion status if we have a noteId
    if (data.noteId) {
      await deps.addStatusEventAndBroadcast({
        noteId: data.noteId,
        status: "COMPLETED",
        message: `HTML cleaning completed: ${truncatedCleanedContent}`,
        context: "clean_html",
      });
    }

    return {
      ...data,
      file: {
        ...data.file,
        content: cleanedContent,
      },
    };
  }
}
