import { CompletionMessages, ImportStatus } from "./types";

import { StatusEvent } from "../../hooks/use-status-websocket";

export function processStatusEvents(
  events: StatusEvent[]
): Map<string, ImportStatus> {
  const statusMap = new Map<string, ImportStatus>();

  for (const event of events) {
    // Create new import status if it doesn't exist
    if (!statusMap.has(event.importId)) {
      statusMap.set(event.importId, {
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
          image: { status: "pending" },
          duplicates: { status: "pending" },
        },
        createdAt: new Date(event.createdAt),
      });
    }

    const status = statusMap.get(event.importId)!;
    const hasError = !!event.errorMessage && event.errorMessage.trim() !== "";

    // Update note title and ID
    if (event.metadata?.noteTitle) {
      status.noteTitle = event.metadata.noteTitle as string;
    }
    if (event.noteId) {
      status.noteId = event.noteId;
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
          status.steps.cleaning = { status: "completed" };
        } else {
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
          status.steps.structure = { status: "completed" };
        } else {
          status.steps.structure = { status: "processing" };
        }
        break;

      case "note_processing":
        if (hasError) {
          status.steps.noteProcessing = {
            status: "failed",
            error: event.errorMessage,
          };
        } else {
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
        } else {
          status.steps.source = { status: "processing" };
        }
        break;

      case "image_processing":
        if (hasError) {
          status.steps.image = {
            status: "failed",
            error: event.errorMessage,
          };
        } else if (event.message?.includes(CompletionMessages.ADD_IMAGE)) {
          status.steps.image = { status: "completed" };
        } else {
          status.steps.image = { status: "processing" };
        }
        break;

      case "CHECK_DUPLICATES":
        if (hasError) {
          status.steps.duplicates = {
            status: "failed",
            error: event.errorMessage,
          };
        } else if (
          event.message?.includes(CompletionMessages.VERIFY_DUPLICATES)
        ) {
          status.steps.duplicates = { status: "completed" };
        } else {
          status.steps.duplicates = { status: "processing" };
        }
        break;
    }

    // Check if all steps are completed to mark import as completed
    const allStepsCompleted =
      status.steps.cleaning.status === "completed" &&
      status.steps.structure.status === "completed" &&
      status.steps.noteProcessing.status === "completed" &&
      status.steps.ingredients.status === "completed" &&
      status.steps.instructions.status === "completed" &&
      status.steps.source.status === "completed" &&
      status.steps.image.status === "completed" &&
      status.steps.duplicates.status === "completed";

    if (allStepsCompleted && status.status === "importing") {
      status.status = "completed";
      status.completedAt = new Date();
    }

    // Check if any step failed to mark import as failed
    const anyStepFailed =
      status.steps.cleaning.status === "failed" ||
      status.steps.structure.status === "failed" ||
      status.steps.noteProcessing.status === "failed" ||
      status.steps.ingredients.status === "failed" ||
      status.steps.instructions.status === "failed" ||
      status.steps.source.status === "failed" ||
      status.steps.image.status === "failed" ||
      status.steps.duplicates.status === "failed";

    if (anyStepFailed && status.status === "importing") {
      status.status = "failed";
    }
  }

  return statusMap;
}
