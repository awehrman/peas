import { describe, expect, it } from "vitest";

import { WORKER_CONSTANTS } from "../../shared/constants";
import { StatusUtils } from "../../shared/status-utils";

describe("StatusUtils", () => {
  describe("createProcessingStatus", () => {
    it("should create processing status with basic data", () => {
      const data = {
        importId: "import-123",
        message: "Processing note",
      };

      const result = StatusUtils.createProcessingStatus(data);

      expect(result).toEqual({
        type: "PROCESSING",
        message: "Processing note",
        timestamp: expect.any(Date),
        severity: "info",
        metadata: undefined,
        jobId: "import-123",
        noteId: undefined,
        context: {
          type: WORKER_CONSTANTS.STATUS_CONTEXTS.PROCESSING,
        },
      });
    });

    it("should create processing status with all optional fields", () => {
      const data = {
        importId: "import-123",
        noteId: "note-456",
        message: "Processing note",
        context: "custom-context",
        indentLevel: 2,
        metadata: { key: "value" },
      };

      const result = StatusUtils.createProcessingStatus(data);

      expect(result).toEqual({
        type: "PROCESSING",
        message: "Processing note",
        timestamp: expect.any(Date),
        severity: "info",
        metadata: { key: "value" },
        jobId: "import-123",
        noteId: "note-456",
        context: {
          type: "custom-context",
        },
      });
    });

    it("should handle object context", () => {
      const data = {
        importId: "import-123",
        message: "Processing note",
        context: { customKey: "customValue", type: "custom-type" },
      };

      const result = StatusUtils.createProcessingStatus(data);

      expect(result).toEqual({
        type: "PROCESSING",
        message: "Processing note",
        timestamp: expect.any(Date),
        severity: "info",
        metadata: undefined,
        jobId: "import-123",
        noteId: undefined,
        context: { customKey: "customValue", type: "custom-type" },
      });
    });

    it("should handle undefined context", () => {
      const data = {
        importId: "import-123",
        message: "Processing note",
        context: undefined,
      };

      const result = StatusUtils.createProcessingStatus(data);

      expect(result.context).toEqual({
        type: WORKER_CONSTANTS.STATUS_CONTEXTS.PROCESSING,
      });
    });
  });

  describe("createCompletionStatus", () => {
    it("should create completion status with basic data", () => {
      const data = {
        importId: "import-123",
        message: "Note processed successfully",
      };

      const result = StatusUtils.createCompletionStatus(data);

      expect(result).toEqual({
        type: "COMPLETED",
        message: "Note processed successfully",
        timestamp: expect.any(Date),
        severity: "info",
        metadata: undefined,
        jobId: "import-123",
        noteId: undefined,
        context: {
          type: WORKER_CONSTANTS.STATUS_CONTEXTS.IMPORT_COMPLETE,
        },
      });
    });

    it("should create completion status with all optional fields", () => {
      const data = {
        importId: "import-123",
        noteId: "note-456",
        message: "Note processed successfully",
        context: "custom-complete-context",
        indentLevel: 1,
        metadata: { processedItems: 10 },
      };

      const result = StatusUtils.createCompletionStatus(data);

      expect(result).toEqual({
        type: "COMPLETED",
        message: "Note processed successfully",
        timestamp: expect.any(Date),
        severity: "info",
        metadata: { processedItems: 10 },
        jobId: "import-123",
        noteId: "note-456",
        context: {
          type: "custom-complete-context",
        },
      });
    });

    it("should handle object context", () => {
      const data = {
        importId: "import-123",
        message: "Note processed successfully",
        context: { completionType: "full", itemsProcessed: 5 },
      };

      const result = StatusUtils.createCompletionStatus(data);

      expect(result).toEqual({
        type: "COMPLETED",
        message: "Note processed successfully",
        timestamp: expect.any(Date),
        severity: "info",
        metadata: undefined,
        jobId: "import-123",
        noteId: undefined,
        context: { completionType: "full", itemsProcessed: 5 },
      });
    });

    it("should handle undefined context", () => {
      const data = {
        importId: "import-123",
        message: "Note processed successfully",
        context: undefined,
      };

      const result = StatusUtils.createCompletionStatus(data);

      expect(result.context).toEqual({
        type: WORKER_CONSTANTS.STATUS_CONTEXTS.IMPORT_COMPLETE,
      });
    });
  });

  describe("createProgressStatus", () => {
    it("should create progress status for incomplete progress", () => {
      const data = {
        importId: "import-123",
        current: 3,
        total: 10,
        itemType: "ingredients",
        context: "parsing",
      };

      const result = StatusUtils.createProgressStatus(data);

      expect(result).toEqual({
        type: "PROCESSING",
        message: `${WORKER_CONSTANTS.EMOJIS.PROCESSING} 3/10 ingredients`,
        timestamp: expect.any(Date),
        severity: "info",
        metadata: {
          current: 3,
          total: 10,
          isComplete: false,
        },
        jobId: "import-123",
        noteId: undefined,
        context: {
          type: "parsing",
        },
      });
    });

    it("should create completion status when progress is complete", () => {
      const data = {
        importId: "import-123",
        current: 10,
        total: 10,
        itemType: "ingredients",
        context: "parsing",
      };

      const result = StatusUtils.createProgressStatus(data);

      expect(result).toEqual({
        type: "COMPLETED",
        message: `${WORKER_CONSTANTS.EMOJIS.SUCCESS} 10/10 ingredients`,
        timestamp: expect.any(Date),
        severity: "info",
        metadata: {
          current: 10,
          total: 10,
          isComplete: true,
        },
        jobId: "import-123",
        noteId: undefined,
        context: {
          type: "parsing",
        },
      });
    });

    it("should create progress status with all optional fields", () => {
      const data = {
        importId: "import-123",
        noteId: "note-456",
        current: 5,
        total: 15,
        itemType: "instructions",
        context: "processing",
        indentLevel: 2,
        metadata: { batchSize: 5 },
      };

      const result = StatusUtils.createProgressStatus(data);

      expect(result).toEqual({
        type: "PROCESSING",
        message: `${WORKER_CONSTANTS.EMOJIS.PROCESSING} 5/15 instructions`,
        timestamp: expect.any(Date),
        severity: "info",
        metadata: {
          batchSize: 5,
          current: 5,
          total: 15,
          isComplete: false,
        },
        jobId: "import-123",
        noteId: "note-456",
        context: {
          type: "processing",
        },
      });
    });

    it("should handle object context", () => {
      const data = {
        importId: "import-123",
        current: 2,
        total: 8,
        itemType: "items",
        context: { processingType: "batch", stage: "validation" },
      };

      const result = StatusUtils.createProgressStatus(data);

      expect(result).toEqual({
        type: "PROCESSING",
        message: `${WORKER_CONSTANTS.EMOJIS.PROCESSING} 2/8 items`,
        timestamp: expect.any(Date),
        severity: "info",
        metadata: {
          current: 2,
          total: 8,
          isComplete: false,
        },
        jobId: "import-123",
        noteId: undefined,
        context: { processingType: "batch", stage: "validation" },
      });
    });

    it("should handle zero progress", () => {
      const data = {
        importId: "import-123",
        current: 0,
        total: 5,
        itemType: "files",
        context: "upload",
      };

      const result = StatusUtils.createProgressStatus(data);

      expect(result).toEqual({
        type: "PROCESSING",
        message: `${WORKER_CONSTANTS.EMOJIS.PROCESSING} 0/5 files`,
        timestamp: expect.any(Date),
        severity: "info",
        metadata: {
          current: 0,
          total: 5,
          isComplete: false,
        },
        jobId: "import-123",
        noteId: undefined,
        context: {
          type: "upload",
        },
      });
    });
  });

  describe("createErrorStatus", () => {
    it("should create error status with basic data", () => {
      const data = {
        importId: "import-123",
        message: "Failed to process note",
      };

      const result = StatusUtils.createErrorStatus(data);

      expect(result).toEqual({
        type: "FAILED",
        message: `${WORKER_CONSTANTS.EMOJIS.ERROR} Failed to process note`,
        timestamp: expect.any(Date),
        severity: "error",
        metadata: undefined,
        jobId: "import-123",
        noteId: undefined,
        context: {
          type: WORKER_CONSTANTS.STATUS_CONTEXTS.ERROR,
        },
      });
    });

    it("should create error status with all optional fields", () => {
      const data = {
        importId: "import-123",
        noteId: "note-456",
        message: "Validation failed",
        context: "validation-error",
        indentLevel: 1,
        metadata: { errorCode: "VAL_001", field: "title" },
      };

      const result = StatusUtils.createErrorStatus(data);

      expect(result).toEqual({
        type: "FAILED",
        message: `${WORKER_CONSTANTS.EMOJIS.ERROR} Validation failed`,
        timestamp: expect.any(Date),
        severity: "error",
        metadata: { errorCode: "VAL_001", field: "title" },
        jobId: "import-123",
        noteId: "note-456",
        context: {
          type: "validation-error",
        },
      });
    });

    it("should handle object context", () => {
      const data = {
        importId: "import-123",
        message: "Database connection failed",
        context: { errorType: "connection", retryCount: 3 },
      };

      const result = StatusUtils.createErrorStatus(data);

      expect(result).toEqual({
        type: "FAILED",
        message: `${WORKER_CONSTANTS.EMOJIS.ERROR} Database connection failed`,
        timestamp: expect.any(Date),
        severity: "error",
        metadata: undefined,
        jobId: "import-123",
        noteId: undefined,
        context: { errorType: "connection", retryCount: 3 },
      });
    });

    it("should handle undefined context", () => {
      const data = {
        importId: "import-123",
        message: "Unknown error occurred",
        context: undefined,
      };

      const result = StatusUtils.createErrorStatus(data);

      expect(result.context).toEqual({
        type: WORKER_CONSTANTS.STATUS_CONTEXTS.ERROR,
      });
    });

    it("should handle empty string context", () => {
      const data = {
        importId: "import-123",
        message: "Error with empty context",
        context: "",
      };

      const result = StatusUtils.createErrorStatus(data);

      expect(result.context).toEqual({
        type: WORKER_CONSTANTS.STATUS_CONTEXTS.ERROR,
      });
    });
  });

  describe("timestamp consistency", () => {
    it("should create timestamps that are recent", () => {
      const before = new Date();
      const result = StatusUtils.createProcessingStatus({
        importId: "import-123",
        message: "Test",
      });
      const after = new Date();

      expect(result.timestamp.getTime()).toBeGreaterThanOrEqual(
        before.getTime()
      );
      expect(result.timestamp.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it("should create different timestamps for different calls", async () => {
      const result1 = StatusUtils.createProcessingStatus({
        importId: "import-123",
        message: "Test 1",
      });

      // Add a delay to ensure different timestamps
      await new Promise((resolve) => setTimeout(resolve, 10));

      const result2 = StatusUtils.createProcessingStatus({
        importId: "import-123",
        message: "Test 2",
      });

      expect(result1.timestamp.getTime()).toBeLessThan(
        result2.timestamp.getTime()
      );
    });
  });

  describe("emoji usage", () => {
    it("should use correct emojis for different status types", () => {
      const progressIncomplete = StatusUtils.createProgressStatus({
        importId: "import-123",
        current: 1,
        total: 2,
        itemType: "items",
        context: "test",
      });

      const progressComplete = StatusUtils.createProgressStatus({
        importId: "import-123",
        current: 2,
        total: 2,
        itemType: "items",
        context: "test",
      });

      const error = StatusUtils.createErrorStatus({
        importId: "import-123",
        message: "Error",
      });

      expect(progressIncomplete.message).toContain(
        WORKER_CONSTANTS.EMOJIS.PROCESSING
      );
      expect(progressComplete.message).toContain(
        WORKER_CONSTANTS.EMOJIS.SUCCESS
      );
      expect(error.message).toContain(WORKER_CONSTANTS.EMOJIS.ERROR);
    });
  });
});
