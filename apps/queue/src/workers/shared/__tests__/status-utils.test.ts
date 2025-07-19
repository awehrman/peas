import { describe, it, expect } from "vitest";
import { StatusUtils } from "../status-utils";
import { WORKER_CONSTANTS } from "../constants";

describe("StatusUtils", () => {
  describe("createProcessingStatus", () => {
    it("should create a processing status with all required fields", () => {
      const data = {
        importId: "import-123",
        noteId: "note-456",
        message: "Processing started",
        context: "test-context",
        indentLevel: 2,
        metadata: { key: "value" },
      };

      const result = StatusUtils.createProcessingStatus(data);

      expect(result).toEqual({
        importId: "import-123",
        noteId: "note-456",
        status: "PROCESSING",
        message: "Processing started",
        context: "test-context",
        indentLevel: 2,
        metadata: { key: "value" },
      });
    });

    it("should use default context when not provided", () => {
      const data = {
        importId: "import-123",
        message: "Processing started",
      };

      const result = StatusUtils.createProcessingStatus(data);

      expect(result).toEqual({
        importId: "import-123",
        noteId: undefined,
        status: "PROCESSING",
        message: "Processing started",
        context: WORKER_CONSTANTS.STATUS_CONTEXTS.PROCESSING,
        indentLevel: WORKER_CONSTANTS.INDENT_LEVELS.MAIN_OPERATION,
        metadata: undefined,
      });
    });

    it("should use default indent level when not provided", () => {
      const data = {
        importId: "import-123",
        message: "Processing started",
        context: "custom-context",
      };

      const result = StatusUtils.createProcessingStatus(data);

      expect(result).toEqual({
        importId: "import-123",
        noteId: undefined,
        status: "PROCESSING",
        message: "Processing started",
        context: "custom-context",
        indentLevel: WORKER_CONSTANTS.INDENT_LEVELS.MAIN_OPERATION,
        metadata: undefined,
      });
    });

    it("should handle optional noteId", () => {
      const data = {
        importId: "import-123",
        message: "Processing started",
      };

      const result = StatusUtils.createProcessingStatus(data);

      expect(result.noteId).toBeUndefined();
    });

    it("should handle optional metadata", () => {
      const data = {
        importId: "import-123",
        message: "Processing started",
      };

      const result = StatusUtils.createProcessingStatus(data);

      expect(result.metadata).toBeUndefined();
    });
  });

  describe("createCompletionStatus", () => {
    it("should create a completion status with all required fields", () => {
      const data = {
        importId: "import-123",
        noteId: "note-456",
        message: "Processing completed",
        context: "test-context",
        indentLevel: 0,
        metadata: { key: "value" },
      };

      const result = StatusUtils.createCompletionStatus(data);

      expect(result).toEqual({
        importId: "import-123",
        noteId: "note-456",
        status: "COMPLETED",
        message: "Processing completed",
        context: "test-context",
        indentLevel: 0,
        metadata: { key: "value" },
      });
    });

    it("should use default context when not provided", () => {
      const data = {
        importId: "import-123",
        message: "Processing completed",
      };

      const result = StatusUtils.createCompletionStatus(data);

      expect(result).toEqual({
        importId: "import-123",
        noteId: undefined,
        status: "COMPLETED",
        message: "Processing completed",
        context: WORKER_CONSTANTS.STATUS_CONTEXTS.IMPORT_COMPLETE,
        indentLevel: WORKER_CONSTANTS.INDENT_LEVELS.TOP_LEVEL,
        metadata: undefined,
      });
    });

    it("should use default indent level when not provided", () => {
      const data = {
        importId: "import-123",
        message: "Processing completed",
        context: "custom-context",
      };

      const result = StatusUtils.createCompletionStatus(data);

      expect(result).toEqual({
        importId: "import-123",
        noteId: undefined,
        status: "COMPLETED",
        message: "Processing completed",
        context: "custom-context",
        indentLevel: WORKER_CONSTANTS.INDENT_LEVELS.TOP_LEVEL,
        metadata: undefined,
      });
    });

    it("should handle optional noteId", () => {
      const data = {
        importId: "import-123",
        message: "Processing completed",
      };

      const result = StatusUtils.createCompletionStatus(data);

      expect(result.noteId).toBeUndefined();
    });

    it("should handle optional metadata", () => {
      const data = {
        importId: "import-123",
        message: "Processing completed",
      };

      const result = StatusUtils.createCompletionStatus(data);

      expect(result.metadata).toBeUndefined();
    });
  });

  describe("createProgressStatus", () => {
    it("should create a processing progress status when not complete", () => {
      const data = {
        importId: "import-123",
        noteId: "note-456",
        current: 3,
        total: 10,
        itemType: "ingredients",
        context: "test-context",
        indentLevel: 2,
        metadata: { key: "value" },
      };

      const result = StatusUtils.createProgressStatus(data);

      expect(result).toEqual({
        importId: "import-123",
        noteId: "note-456",
        status: "PROCESSING",
        message: `${WORKER_CONSTANTS.EMOJIS.PROCESSING} 3/10 ingredients`,
        context: "test-context",
        indentLevel: 2,
        metadata: {
          key: "value",
          current: 3,
          total: 10,
          isComplete: false,
        },
      });
    });

    it("should create a completion status when progress is complete", () => {
      const data = {
        importId: "import-123",
        noteId: "note-456",
        current: 10,
        total: 10,
        itemType: "ingredients",
        context: "test-context",
        indentLevel: 2,
        metadata: { key: "value" },
      };

      const result = StatusUtils.createProgressStatus(data);

      expect(result).toEqual({
        importId: "import-123",
        noteId: "note-456",
        status: "COMPLETED",
        message: `${WORKER_CONSTANTS.EMOJIS.SUCCESS} 10/10 ingredients`,
        context: "test-context",
        indentLevel: 2,
        metadata: {
          key: "value",
          current: 10,
          total: 10,
          isComplete: true,
        },
      });
    });

    it("should use default indent level when not provided", () => {
      const data = {
        importId: "import-123",
        current: 5,
        total: 10,
        itemType: "ingredients",
        context: "test-context",
      };

      const result = StatusUtils.createProgressStatus(data);

      expect(result).toEqual({
        importId: "import-123",
        noteId: undefined,
        status: "PROCESSING",
        message: `${WORKER_CONSTANTS.EMOJIS.PROCESSING} 5/10 ingredients`,
        context: "test-context",
        indentLevel: WORKER_CONSTANTS.INDENT_LEVELS.SUB_OPERATION,
        metadata: {
          current: 5,
          total: 10,
          isComplete: false,
        },
      });
    });

    it("should handle optional noteId", () => {
      const data = {
        importId: "import-123",
        current: 5,
        total: 10,
        itemType: "ingredients",
        context: "test-context",
      };

      const result = StatusUtils.createProgressStatus(data);

      expect(result.noteId).toBeUndefined();
    });

    it("should handle optional metadata", () => {
      const data = {
        importId: "import-123",
        current: 5,
        total: 10,
        itemType: "ingredients",
        context: "test-context",
      };

      const result = StatusUtils.createProgressStatus(data);

      expect(result.metadata).toEqual({
        current: 5,
        total: 10,
        isComplete: false,
      });
    });

    it("should handle zero progress", () => {
      const data = {
        importId: "import-123",
        current: 0,
        total: 10,
        itemType: "ingredients",
        context: "test-context",
      };

      const result = StatusUtils.createProgressStatus(data);

      expect(result.status).toBe("PROCESSING");
      expect(result.message).toBe(
        `${WORKER_CONSTANTS.EMOJIS.PROCESSING} 0/10 ingredients`
      );
      expect(result.metadata?.isComplete).toBe(false);
    });

    it("should handle single item progress", () => {
      const data = {
        importId: "import-123",
        current: 1,
        total: 1,
        itemType: "ingredient",
        context: "test-context",
      };

      const result = StatusUtils.createProgressStatus(data);

      expect(result.status).toBe("COMPLETED");
      expect(result.message).toBe(
        `${WORKER_CONSTANTS.EMOJIS.SUCCESS} 1/1 ingredient`
      );
      expect(result.metadata?.isComplete).toBe(true);
    });

    it("should handle large numbers", () => {
      const data = {
        importId: "import-123",
        current: 999,
        total: 1000,
        itemType: "items",
        context: "test-context",
      };

      const result = StatusUtils.createProgressStatus(data);

      expect(result.status).toBe("PROCESSING");
      expect(result.message).toBe(
        `${WORKER_CONSTANTS.EMOJIS.PROCESSING} 999/1000 items`
      );
      expect(result.metadata?.isComplete).toBe(false);
    });
  });

  describe("createErrorStatus", () => {
    it("should create an error status with all required fields", () => {
      const data = {
        importId: "import-123",
        noteId: "note-456",
        message: "Something went wrong",
        context: "test-context",
        indentLevel: 1,
        metadata: { key: "value" },
      };

      const result = StatusUtils.createErrorStatus(data);

      expect(result).toEqual({
        importId: "import-123",
        noteId: "note-456",
        status: "FAILED",
        message: `${WORKER_CONSTANTS.EMOJIS.ERROR} Something went wrong`,
        context: "test-context",
        indentLevel: 1,
        metadata: { key: "value" },
      });
    });

    it("should use default context when not provided", () => {
      const data = {
        importId: "import-123",
        message: "Something went wrong",
      };

      const result = StatusUtils.createErrorStatus(data);

      expect(result).toEqual({
        importId: "import-123",
        noteId: undefined,
        status: "FAILED",
        message: `${WORKER_CONSTANTS.EMOJIS.ERROR} Something went wrong`,
        context: WORKER_CONSTANTS.STATUS_CONTEXTS.ERROR,
        indentLevel: WORKER_CONSTANTS.INDENT_LEVELS.MAIN_OPERATION,
        metadata: undefined,
      });
    });

    it("should use default indent level when not provided", () => {
      const data = {
        importId: "import-123",
        message: "Something went wrong",
        context: "custom-context",
      };

      const result = StatusUtils.createErrorStatus(data);

      expect(result).toEqual({
        importId: "import-123",
        noteId: undefined,
        status: "FAILED",
        message: `${WORKER_CONSTANTS.EMOJIS.ERROR} Something went wrong`,
        context: "custom-context",
        indentLevel: WORKER_CONSTANTS.INDENT_LEVELS.MAIN_OPERATION,
        metadata: undefined,
      });
    });

    it("should handle optional noteId", () => {
      const data = {
        importId: "import-123",
        message: "Something went wrong",
      };

      const result = StatusUtils.createErrorStatus(data);

      expect(result.noteId).toBeUndefined();
    });

    it("should handle optional metadata", () => {
      const data = {
        importId: "import-123",
        message: "Something went wrong",
      };

      const result = StatusUtils.createErrorStatus(data);

      expect(result.metadata).toBeUndefined();
    });

    it("should handle empty error message", () => {
      const data = {
        importId: "import-123",
        message: "",
      };

      const result = StatusUtils.createErrorStatus(data);

      expect(result.message).toBe(`${WORKER_CONSTANTS.EMOJIS.ERROR} `);
    });

    it("should handle long error messages", () => {
      const longMessage = "A".repeat(1000);
      const data = {
        importId: "import-123",
        message: longMessage,
      };

      const result = StatusUtils.createErrorStatus(data);

      expect(result.message).toBe(
        `${WORKER_CONSTANTS.EMOJIS.ERROR} ${longMessage}`
      );
    });
  });

  describe("integration scenarios", () => {
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

  describe("type safety", () => {
    it("should return proper StatusEvent type for all methods", () => {
      const processingResult = StatusUtils.createProcessingStatus({
        importId: "test",
        message: "test",
      });

      const completionResult = StatusUtils.createCompletionStatus({
        importId: "test",
        message: "test",
      });

      const progressResult = StatusUtils.createProgressStatus({
        importId: "test",
        current: 1,
        total: 2,
        itemType: "test",
        context: "test",
      });

      const errorResult = StatusUtils.createErrorStatus({
        importId: "test",
        message: "test",
      });

      // Verify all results have the expected StatusEvent structure
      const expectedKeys = ["importId", "status", "message"];

      expectedKeys.forEach((key) => {
        expect(processingResult).toHaveProperty(key);
        expect(completionResult).toHaveProperty(key);
        expect(progressResult).toHaveProperty(key);
        expect(errorResult).toHaveProperty(key);
      });

      // Verify status values are correct
      expect(processingResult.status).toBe("PROCESSING");
      expect(completionResult.status).toBe("COMPLETED");
      expect(progressResult.status).toBe("PROCESSING"); // Not complete yet
      expect(errorResult.status).toBe("FAILED");
    });
  });
});
