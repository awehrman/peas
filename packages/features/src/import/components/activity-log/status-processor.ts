import { CompletionMessages, ImportStatus } from "./types";

import { StatusEvent } from "../../hooks/use-status-websocket";

/**
 * Helper function to determine if a step should be updated to processing
 * Prevents completed steps from reverting to processing unless there's an error
 */
function shouldUpdateToProcessing(currentStatus: string): boolean {
  return currentStatus === "pending";
}

function shouldUpdateToCompleted(currentStatus: string): boolean {
  return currentStatus === "pending" || currentStatus === "processing";
}

export function processStatusEvents(
  events: StatusEvent[]
): Map<string, ImportStatus> {
  const statusMap = new Map<string, ImportStatus>();

  // Sort events by timestamp to ensure chronological processing
  const sortedEvents = [...events].sort((a, b) => {
    const dateA = new Date(a.createdAt);
    const dateB = new Date(b.createdAt);
    return dateA.getTime() - dateB.getTime();
  });

  for (const event of sortedEvents) {
    console.log(
      `[STATUS_PROCESSOR] Processing event: ${event.context} for import ${event.importId}, noteId: ${event.noteId}, status: ${event.status}`
    );

    // Create a unique key for each note within an import
    // Always use importId as the primary key to group events from the same import
    // If we have a noteId, we'll update the existing status entry
    const statusKey = event.importId;

    // Create new import status if it doesn't exist
    if (!statusMap.has(statusKey)) {
      console.log(
        `[STATUS_PROCESSOR] Creating new status for import ${event.importId}${event.noteId ? `, note ${event.noteId}` : ""}`
      );
      statusMap.set(statusKey, {
        importId: event.importId,
        noteTitle: event.metadata?.noteTitle as string,
        noteId: event.noteId,
        status: "importing",
        steps: {
          cleaning: { status: "pending" },
          structure: { status: "pending" },
          noteProcessing: { status: "pending" },
          ingredients: { status: "pending", current: 0, total: 0, errors: 0 },
          instructions: {
            status: "pending",
            current: 0,
            total: 0,
            errors: 0,
          },
          source: { status: "pending" },
          image: { status: "pending", current: 0, total: 0, errors: 0 },
          duplicates: { status: "pending" },
          categorization: { status: "pending" },
          tags: { status: "pending" },
        },
        createdAt: new Date(event.createdAt),
      });
    }

    const status = statusMap.get(statusKey)!;

    // Update noteId if we get one
    if (event.noteId && !status.noteId) {
      status.noteId = event.noteId;
    }

    // Update note title if available
    if (event.metadata?.noteTitle && !status.noteTitle) {
      status.noteTitle = event.metadata.noteTitle as string;
    }

    // Process the event based on context and status
    const context = event.context?.toLowerCase() || "";
    const eventStatus = event.status?.toLowerCase() || "processing";

    // Handle different contexts
    if (context.includes("cleaning") || context.includes("clean")) {
      if (eventStatus === "completed") {
        status.steps.cleaning.status = "completed";
        status.steps.cleaning.completedAt = new Date(event.createdAt);
      } else if (shouldUpdateToProcessing(status.steps.cleaning.status)) {
        status.steps.cleaning.status = "processing";
      }
    } else if (context.includes("structure") || context.includes("create")) {
      if (eventStatus === "completed") {
        status.steps.structure.status = "completed";
        status.steps.structure.completedAt = new Date(event.createdAt);
      } else if (shouldUpdateToProcessing(status.steps.structure.status)) {
        status.steps.structure.status = "processing";
      }
    } else if (context.includes("note") && !context.includes("ingredient") && !context.includes("instruction")) {
      if (eventStatus === "completed") {
        status.steps.noteProcessing.status = "completed";
        status.steps.noteProcessing.completedAt = new Date(event.createdAt);
      } else if (shouldUpdateToProcessing(status.steps.noteProcessing.status)) {
        status.steps.noteProcessing.status = "processing";
      }
    } else if (context.includes("ingredient")) {
      // Handle ingredient processing with progress
      if (event.currentCount !== undefined && event.totalCount !== undefined) {
        status.steps.ingredients.current = event.currentCount;
        status.steps.ingredients.total = event.totalCount;
        
        if (eventStatus === "completed" || event.currentCount >= event.totalCount) {
          status.steps.ingredients.status = "completed";
          status.steps.ingredients.completedAt = new Date(event.createdAt);
        } else if (shouldUpdateToProcessing(status.steps.ingredients.status)) {
          status.steps.ingredients.status = "processing";
        }
      } else if (eventStatus === "completed") {
        status.steps.ingredients.status = "completed";
        status.steps.ingredients.completedAt = new Date(event.createdAt);
      }
    } else if (context.includes("instruction")) {
      // Handle instruction processing with progress
      if (event.currentCount !== undefined && event.totalCount !== undefined) {
        status.steps.instructions.current = event.currentCount;
        status.steps.instructions.total = event.totalCount;
        
        if (eventStatus === "completed" || event.currentCount >= event.totalCount) {
          status.steps.instructions.status = "completed";
          status.steps.instructions.completedAt = new Date(event.createdAt);
        } else if (shouldUpdateToProcessing(status.steps.instructions.status)) {
          status.steps.instructions.status = "processing";
        }
      } else if (eventStatus === "completed") {
        status.steps.instructions.status = "completed";
        status.steps.instructions.completedAt = new Date(event.createdAt);
      }
    } else if (context.includes("source")) {
      if (eventStatus === "completed") {
        status.steps.source.status = "completed";
        status.steps.source.completedAt = new Date(event.createdAt);
      } else if (shouldUpdateToProcessing(status.steps.source.status)) {
        status.steps.source.status = "processing";
      }
    } else if (context.includes("image")) {
      // Handle image processing with progress
      if (event.currentCount !== undefined && event.totalCount !== undefined) {
        status.steps.image.current = event.currentCount;
        status.steps.image.total = event.totalCount;
        
        if (eventStatus === "completed" || event.currentCount >= event.totalCount) {
          status.steps.image.status = "completed";
          status.steps.image.completedAt = new Date(event.createdAt);
        } else if (shouldUpdateToProcessing(status.steps.image.status)) {
          status.steps.image.status = "processing";
        }
      } else if (eventStatus === "completed") {
        status.steps.image.status = "completed";
        status.steps.image.completedAt = new Date(event.createdAt);
      }
    } else if (context.includes("duplicate") || context.includes("check")) {
      if (eventStatus === "completed") {
        status.steps.duplicates.status = "completed";
        status.steps.duplicates.completedAt = new Date(event.createdAt);
      } else if (shouldUpdateToProcessing(status.steps.duplicates.status)) {
        status.steps.duplicates.status = "processing";
      }
    } else if (context.includes("categorization") || context.includes("category")) {
      if (eventStatus === "completed") {
        status.steps.categorization.status = "completed";
        status.steps.categorization.completedAt = new Date(event.createdAt);
      } else if (shouldUpdateToProcessing(status.steps.categorization.status)) {
        status.steps.categorization.status = "processing";
      }
    } else if (context.includes("tag")) {
      if (eventStatus === "completed") {
        status.steps.tags.status = "completed";
        status.steps.tags.completedAt = new Date(event.createdAt);
      } else if (shouldUpdateToProcessing(status.steps.tags.status)) {
        status.steps.tags.status = "processing";
      }
    }

    // Handle completion status
    if (eventStatus === "completed" && context.includes("completion")) {
      // Check if all steps are completed
      const allStepsCompleted = 
        status.steps.cleaning.status === "completed" &&
        status.steps.structure.status === "completed" &&
        status.steps.noteProcessing.status === "completed" &&
        status.steps.ingredients.status === "completed" &&
        status.steps.instructions.status === "completed" &&
        status.steps.source.status === "completed" &&
        status.steps.image.status === "completed" &&
        status.steps.duplicates.status === "completed" &&
        status.steps.categorization.status === "completed" &&
        status.steps.tags.status === "completed";

      if (allStepsCompleted) {
        status.status = "completed";
        status.completedAt = new Date(event.createdAt);
        console.log(`[STATUS_PROCESSOR] Import ${event.importId} marked as completed`);
      }
    }

    // Handle error status
    if (eventStatus === "failed" || event.errorMessage) {
      status.status = "failed";
      // Set the specific step that failed
      if (context.includes("ingredient")) {
        status.steps.ingredients.status = "failed";
        status.steps.ingredients.error = event.errorMessage || "Failed to process ingredients";
      } else if (context.includes("instruction")) {
        status.steps.instructions.status = "failed";
        status.steps.instructions.error = event.errorMessage || "Failed to process instructions";
      } else if (context.includes("image")) {
        status.steps.image.status = "failed";
        status.steps.image.error = event.errorMessage || "Failed to process images";
      } else if (context.includes("source")) {
        status.steps.source.status = "failed";
        status.steps.source.error = event.errorMessage || "Failed to process source";
      } else if (context.includes("duplicate")) {
        status.steps.duplicates.status = "failed";
        status.steps.duplicates.error = event.errorMessage || "Failed to check duplicates";
      } else if (context.includes("categorization")) {
        status.steps.categorization.status = "failed";
        status.steps.categorization.error = event.errorMessage || "Failed to categorize";
      } else if (context.includes("tag")) {
        status.steps.tags.status = "failed";
        status.steps.tags.error = event.errorMessage || "Failed to process tags";
      }
    }
  }

  return statusMap;
}
