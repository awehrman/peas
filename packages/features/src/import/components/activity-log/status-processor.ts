import { CompletionMessages, ImportStatus } from "./types";

import { StatusEvent } from "../../hooks/use-status-websocket";

/**
 * Helper function to determine if a step should be updated to processing
 * Prevents completed steps from reverting to processing unless there's an error
 */
function shouldUpdateToProcessing(currentStatus: string): boolean {
  // Only allow updates if the step is still pending
  // Once completed, it stays completed unless there's an explicit error
  return currentStatus === "pending";
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
    const hasError = !!event.errorMessage && event.errorMessage.trim() !== "";

    // Update note title and ID (only if not already set)
    if (event.metadata?.noteTitle && !status.noteTitle) {
      status.noteTitle = event.metadata.noteTitle as string;
    }
    if (event.noteId && !status.noteId) {
      status.noteId = event.noteId;
    }

    // Update createdAt to the earliest event
    if (new Date(event.createdAt) < status.createdAt) {
      status.createdAt = new Date(event.createdAt);
    }

    // Process different contexts
    switch (event.context) {
      case "clean_html":
        if (hasError) {
          status.steps.cleaning = {
            status: "failed",
            error: event.errorMessage,
          };
        } else if (event.message?.includes(CompletionMessages.CLEAN_HTML)) {
          status.steps.cleaning = {
            status: "completed",
            completedAt: new Date(event.createdAt),
          };
        } else if (shouldUpdateToProcessing(status.steps.cleaning.status)) {
          status.steps.cleaning = { status: "processing" };
        }
        break;

      case "save_note":
        if (hasError) {
          status.steps.structure = {
            status: "failed",
            error: event.errorMessage,
          };
        } else if (
          event.message?.includes(CompletionMessages.CREATE_STRUCTURE)
        ) {
          status.steps.structure = {
            status: "completed",
            completedAt: new Date(event.createdAt),
          };
        } else if (shouldUpdateToProcessing(status.steps.structure.status)) {
          status.steps.structure = { status: "processing" };
        }
        break;

      case "note_processing":
        if (hasError) {
          status.steps.noteProcessing = {
            status: "failed",
            error: event.errorMessage,
          };
        } else if (status.steps.noteProcessing.status !== "completed") {
          status.steps.noteProcessing = { status: "processing" };
        }
        break;

      case "ingredient_processing":
        status.steps.ingredients.status = "processing";
        if (
          event.currentCount !== undefined &&
          event.totalCount !== undefined
        ) {
          status.steps.ingredients.current = event.currentCount;
          status.steps.ingredients.total = event.totalCount;
        }
        if (hasError) {
          status.steps.ingredients.errors++;
        }
        if (
          status.steps.ingredients.current === status.steps.ingredients.total &&
          status.steps.ingredients.total > 0
        ) {
          status.steps.ingredients.status = "completed";
        }

        // Mark noteProcessing as completed when both ingredients and instructions are done
        if (
          status.steps.ingredients.status === "completed" &&
          status.steps.instructions.status === "completed"
        ) {
          status.steps.noteProcessing.status = "completed";
        }
        break;

      case "instruction_processing":
        status.steps.instructions.status = "processing";
        if (
          event.currentCount !== undefined &&
          event.totalCount !== undefined
        ) {
          status.steps.instructions.current = event.currentCount;
          status.steps.instructions.total = event.totalCount;
        }
        if (hasError) {
          status.steps.instructions.errors++;
        }
        if (
          status.steps.instructions.current ===
            status.steps.instructions.total &&
          status.steps.instructions.total > 0
        ) {
          status.steps.instructions.status = "completed";
        }

        // Mark noteProcessing as completed when both ingredients and instructions are done
        if (
          status.steps.ingredients.status === "completed" &&
          status.steps.instructions.status === "completed"
        ) {
          status.steps.noteProcessing.status = "completed";
        }
        break;

      case "PROCESS_SOURCE":
        if (hasError) {
          status.steps.source = {
            status: "failed",
            error: event.errorMessage,
          };
        } else if (event.message?.includes(CompletionMessages.ADD_SOURCE)) {
          status.steps.source = { status: "completed" };
        } else if (shouldUpdateToProcessing(status.steps.source.status)) {
          status.steps.source = { status: "processing" };
        }
        break;

      case "image_processing":
        if (hasError) {
          status.steps.image = {
            status: "failed",
            error: event.errorMessage,
            current: status.steps.image.current,
            total: status.steps.image.total,
            errors: status.steps.image.errors + 1,
          };
        } else if (event.message?.includes(CompletionMessages.ADD_IMAGE)) {
          status.steps.image = {
            status: "completed",
            current: status.steps.image.current,
            total: status.steps.image.total,
            errors: status.steps.image.errors,
          };
        } else if (
          event.currentCount !== undefined &&
          event.totalCount !== undefined
        ) {
          // Handle progress updates for image processing
          status.steps.image = {
            status: "processing",
            current: event.currentCount,
            total: event.totalCount,
            errors: status.steps.image.errors,
          };

          // Mark as completed if all images are processed
          if (event.currentCount >= event.totalCount && event.totalCount > 0) {
            status.steps.image = {
              status: "completed",
              current: event.currentCount,
              total: event.totalCount,
              errors: status.steps.image.errors,
            };
          }
        } else if (shouldUpdateToProcessing(status.steps.image.status)) {
          status.steps.image = {
            status: "processing",
            current: status.steps.image.current,
            total: status.steps.image.total,
            errors: status.steps.image.errors,
          };
        }
        break;

      case "CHECK_DUPLICATES":
        if (hasError) {
          status.steps.duplicates = {
            status: "failed",
            error: event.errorMessage,
          };
        } else if (
          event.message?.includes(CompletionMessages.VERIFY_DUPLICATES) ||
          event.message?.includes(CompletionMessages.DUPLICATE_IDENTIFIED)
        ) {
          status.steps.duplicates = {
            status: "completed",
            message: event.message,
          };
        } else if (shouldUpdateToProcessing(status.steps.duplicates.status)) {
          status.steps.duplicates = { status: "processing" };
        }
        break;

      case "categorization_scheduling":
        // Only set to processing if not already completed
        if (status.steps.categorization.status !== "completed") {
          status.steps.categorization = { status: "processing" };
        }
        break;

      case "categorization_start":
        // Only set to processing if not already completed
        if (status.steps.categorization.status !== "completed") {
          status.steps.categorization = { status: "processing" };
        }
        break;

      case "categorization_complete":
        console.log(
          `[STATUS_PROCESSOR] Categorization complete for import ${event.importId}, hasError: ${hasError}, message: ${event.message}`
        );
        if (hasError) {
          status.steps.categorization = {
            status: "failed",
            error: event.errorMessage,
          };
        } else {
          status.steps.categorization = {
            status: "completed",
            message: event.message,
          };
        }
        console.log(
          `[STATUS_PROCESSOR] Categorization status set to: ${status.steps.categorization.status}`
        );
        break;

      case "tag_determination_start":
        // Only set to processing if not already completed
        if (status.steps.tags.status !== "completed") {
          status.steps.tags = { status: "processing" };
        }
        break;

      case "tag_determination_complete":
        console.log(
          `[STATUS_PROCESSOR] Tag determination complete for import ${event.importId}, hasError: ${hasError}, message: ${event.message}`
        );
        if (hasError) {
          status.steps.tags = {
            status: "failed",
            error: event.errorMessage,
          };
        } else {
          status.steps.tags = {
            status: "completed",
            message: event.message,
          };
        }
        console.log(
          `[STATUS_PROCESSOR] Tags status set to: ${status.steps.tags.status}`
        );
        break;

      case "import_complete":
        console.log(
          `[STATUS_PROCESSOR] Import complete for import ${event.importId}, message: ${event.message}`
        );
        // Mark the overall import as completed
        status.status = "completed";
        status.completedAt = new Date();

        // Update note title if provided in metadata
        if (event.metadata?.noteTitle) {
          status.noteTitle = event.metadata.noteTitle as string;
        }
        break;
    }

    // Note: Import completion is now handled by the "import_complete" event
    // This ensures proper sequencing and prevents race conditions

    // Check if any step failed to mark import as failed
    const anyStepFailed =
      status.steps.cleaning.status === "failed" ||
      status.steps.structure.status === "failed" ||
      status.steps.noteProcessing.status === "failed" ||
      status.steps.ingredients.status === "failed" ||
      status.steps.instructions.status === "failed" ||
      status.steps.source.status === "failed" ||
      status.steps.image.status === "failed" ||
      status.steps.duplicates.status === "failed" ||
      status.steps.categorization.status === "failed" ||
      status.steps.tags.status === "failed";

    if (anyStepFailed && status.status === "importing") {
      status.status = "failed";
    }
  }

  return statusMap;
}
