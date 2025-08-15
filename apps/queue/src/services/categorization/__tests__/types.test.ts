import { beforeEach, describe, expect, it, vi } from "vitest";

import type { CategorizationJobData } from "../../categorization/types";

describe("Categorization Types", () => {
  let createCategorizationJobData: (
    noteId: string,
    importId: string,
    originalJobId?: string
  ) => CategorizationJobData;
  let testNoteId: string;
  let testImportId: string;
  let testOriginalJobId: string;

  beforeEach(async () => {
    vi.clearAllMocks();
    
    // Import the function to test
    const { createCategorizationJobData: importedFunction } = await import("../../categorization/types");
    createCategorizationJobData = importedFunction;

    testNoteId = "test-note-123";
    testImportId = "test-import-456";
    testOriginalJobId = "test-original-job-789";
  });

  describe("CategorizationJobData interface", () => {
    it("should accept valid job data structure", () => {
      const validJobData = {
        noteId: "test-note-123",
        importId: "test-import-456",
        jobId: "test-job-789",
        metadata: {
          category: "dessert",
          tags: ["sweet", "chocolate"],
        },
      };

      expect(validJobData.noteId).toBe("test-note-123");
      expect(validJobData.importId).toBe("test-import-456");
      expect(validJobData.jobId).toBe("test-job-789");
      expect(validJobData.metadata).toEqual({
        category: "dessert",
        tags: ["sweet", "chocolate"],
      });
    });

    it("should accept job data without metadata", () => {
      const jobDataWithoutMetadata = {
        noteId: "test-note-123",
        importId: "test-import-456",
        jobId: "test-job-789",
        metadata: undefined,
      };

      expect(jobDataWithoutMetadata.noteId).toBe("test-note-123");
      expect(jobDataWithoutMetadata.importId).toBe("test-import-456");
      expect(jobDataWithoutMetadata.jobId).toBe("test-job-789");
      expect(jobDataWithoutMetadata.metadata).toBeUndefined();
    });
  });

  describe("createCategorizationJobData", () => {
    it("should create job data with all required fields", () => {
      const result = createCategorizationJobData(testNoteId, testImportId, testOriginalJobId);

      expect(result.noteId).toBe(testNoteId);
      expect(result.importId).toBe(testImportId);
      expect(result.jobId).toMatch(/^categorization-test-note-123-\d+$/);
      expect(result.metadata).toEqual({
        originalJobId: testOriginalJobId,
        triggeredBy: "ingredient_completion",
        scheduledAt: expect.any(String),
      });
    });

    it("should create job data without originalJobId", () => {
      const result = createCategorizationJobData(testNoteId, testImportId);

      expect(result.noteId).toBe(testNoteId);
      expect(result.importId).toBe(testImportId);
      expect(result.jobId).toMatch(/^categorization-test-note-123-\d+$/);
      expect(result.metadata).toEqual({
        originalJobId: undefined,
        triggeredBy: "ingredient_completion",
        scheduledAt: expect.any(String),
      });
    });

    it("should generate unique job IDs for different calls", () => {
      const result1 = createCategorizationJobData(testNoteId, testImportId);
      const result2 = createCategorizationJobData(testNoteId, testImportId);

      expect(result1.jobId).not.toBe(result2.jobId);
      expect(result1.jobId).toMatch(/^categorization-test-note-123-\d+$/);
      expect(result2.jobId).toMatch(/^categorization-test-note-123-\d+$/);
    });

    it("should include current timestamp in job ID", () => {
      const beforeCall = Date.now();
      const result = createCategorizationJobData(testNoteId, testImportId);
      const afterCall = Date.now();

      const jobIdTimestamp = parseInt(result.jobId.split('-').pop()!);
      expect(jobIdTimestamp).toBeGreaterThanOrEqual(beforeCall);
      expect(jobIdTimestamp).toBeLessThanOrEqual(afterCall + 1000); // Account for random increment up to 1000
    });

    it("should create valid ISO timestamp in metadata", () => {
      const result = createCategorizationJobData(testNoteId, testImportId);

      const scheduledAt = new Date(result.metadata!.scheduledAt as string);
      expect(scheduledAt.getTime()).not.toBeNaN();
      expect(result.metadata!.scheduledAt as string).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });

    it("should handle empty strings for noteId and importId", () => {
      const result = createCategorizationJobData("", "", testOriginalJobId);

      expect(result.noteId).toBe("");
      expect(result.importId).toBe("");
      expect(result.jobId).toMatch(/^categorization--\d+$/);
      expect(result.metadata).toEqual({
        originalJobId: testOriginalJobId,
        triggeredBy: "ingredient_completion",
        scheduledAt: expect.any(String),
      });
    });

    it("should handle special characters in noteId and importId", () => {
      const specialNoteId = "test-note-123!@#$%^&*()";
      const specialImportId = "test-import-456!@#$%^&*()";
      
      const result = createCategorizationJobData(specialNoteId, specialImportId);

      expect(result.noteId).toBe(specialNoteId);
      expect(result.importId).toBe(specialImportId);
      expect(result.jobId).toMatch(/^categorization-test-note-123!@#\$%\^&\*\(\)-\d+$/);
    });

    it("should handle very long noteId and importId", () => {
      const longNoteId = "a".repeat(1000);
      const longImportId = "b".repeat(1000);
      
      const result = createCategorizationJobData(longNoteId, longImportId);

      expect(result.noteId).toBe(longNoteId);
      expect(result.importId).toBe(longImportId);
      expect(result.jobId).toMatch(new RegExp(`^categorization-${longNoteId}-\\d+$`));
    });
  });
});
