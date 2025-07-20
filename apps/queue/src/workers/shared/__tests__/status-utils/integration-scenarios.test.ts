import { describe, it, expect } from "vitest";
import { StatusUtils } from "../../status-utils";
import { WORKER_CONSTANTS } from "../../constants";

describe("StatusUtils - Integration Scenarios", () => {
  it("should create a complete workflow status sequence", () => {
    const importId = "import-123";
    const noteId = "note-456";

    // Start processing
    const processingStatus = StatusUtils.createProcessingStatus({
      importId,
      noteId,
      message: "Starting ingredient processing",
      context: "ingredient-processing",
    });

    // Progress updates
    const progress1 = StatusUtils.createProgressStatus({
      importId,
      noteId,
      current: 1,
      total: 5,
      itemType: "ingredients",
      context: "ingredient-processing",
    });

    const progress2 = StatusUtils.createProgressStatus({
      importId,
      noteId,
      current: 5,
      total: 5,
      itemType: "ingredients",
      context: "ingredient-processing",
    });

    // Completion
    const completionStatus = StatusUtils.createCompletionStatus({
      importId,
      noteId,
      message: "Ingredient processing completed",
      context: "ingredient-processing",
    });

    // Verify the sequence
    expect(processingStatus.status).toBe("PROCESSING");
    expect(progress1.status).toBe("PROCESSING");
    expect(progress2.status).toBe("COMPLETED");
    expect(completionStatus.status).toBe("COMPLETED");

    expect(processingStatus.message).toBe("Starting ingredient processing");
    expect(progress1.message).toBe(
      `${WORKER_CONSTANTS.EMOJIS.PROCESSING} 1/5 ingredients`
    );
    expect(progress2.message).toBe(
      `${WORKER_CONSTANTS.EMOJIS.SUCCESS} 5/5 ingredients`
    );
    expect(completionStatus.message).toBe("Ingredient processing completed");
  });

  it("should handle error scenario in workflow", () => {
    const importId = "import-123";
    const noteId = "note-456";

    // Start processing
    const processingStatus = StatusUtils.createProcessingStatus({
      importId,
      noteId,
      message: "Starting ingredient processing",
      context: "ingredient-processing",
    });

    // Error occurs
    const errorStatus = StatusUtils.createErrorStatus({
      importId,
      noteId,
      message: "Failed to parse ingredient line",
      context: "ingredient-processing",
    });

    // Verify the error scenario
    expect(processingStatus.status).toBe("PROCESSING");
    expect(errorStatus.status).toBe("FAILED");
    expect(errorStatus.message).toContain(WORKER_CONSTANTS.EMOJIS.ERROR);
  });
});
