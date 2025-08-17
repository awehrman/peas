import { describe, expect, it } from "vitest";

import type { StatusEvent } from "../../hooks/use-status-websocket";
import {
  calculateProgress,
  createProcessingSteps,
  createStatusSummary,
  generateStatusMessages,
} from "../status-parser";

describe("Status Parser", () => {
  const mockEvents: StatusEvent[] = [
    {
      importId: "test-import-1",
      noteId: "test-note-1",
      status: "PROCESSING",
      message: "File cleaning started",
      context: "file_cleaning",
      createdAt: "2023-01-01T00:00:00Z",
      metadata: {
        htmlFileName: "test.html",
        noteTitle: "Test Recipe",
        sizeRemoved: 1024,
        originalSize: "5.2 KB",
      },
    },
    {
      importId: "test-import-1",
      noteId: "test-note-1",
      status: "COMPLETED",
      message: "File cleaned successfully",
      context: "file_cleaning",
      createdAt: "2023-01-01T00:00:01Z",
      metadata: {
        sizeRemoved: 1024,
        originalSize: "5.2 KB",
      },
    },
    {
      importId: "test-import-1",
      noteId: "test-note-1",
      status: "PROCESSING",
      message: "Processing ingredients",
      context: "ingredient_processing",
      createdAt: "2023-01-01T00:00:02Z",
      currentCount: 5,
      totalCount: 10,
      metadata: {
        totalIngredientLines: 10,
        completedIngredientLines: 5,
        parsingErrors: 2,
      },
    },
    {
      importId: "test-import-1",
      noteId: "test-note-1",
      status: "COMPLETED",
      message: "Note processing completed",
      context: "note_completion",
      createdAt: "2023-01-01T00:00:03Z",
      metadata: {
        totalImages: 3,
        completedImages: 3,
        imageTypes: ["thumbnail", "crop"],
        categories: ["Main"],
        tags: ["asian", "japanese"],
      },
    },
  ];

  describe("createStatusSummary", () => {
    it("should create a comprehensive status summary from events", () => {
      const summary = createStatusSummary(mockEvents);

      expect(summary.noteCreated).toBe(true);
      expect(summary.fileCleaned).toEqual({
        sizeRemoved: "1 KB",
        originalSize: "5.2 KB",
      });
      expect(summary.ingredientsProcessed).toEqual({
        current: 5,
        total: 10,
        errors: 2,
      });
      expect(summary.imagesAdded).toEqual({
        count: 3,
        types: ["thumbnail", "crop"],
      });
      expect(summary.categoriesAdded).toEqual({
        count: 1,
        names: ["Main"],
      });
      expect(summary.tagsAdded).toEqual({
        count: 2,
        names: ["asian", "japanese"],
      });
    });

    it("should handle empty events array", () => {
      const summary = createStatusSummary([]);

      expect(summary.noteCreated).toBe(false);
      expect(summary.parsingErrors).toBe(0);
    });
  });

  describe("generateStatusMessages", () => {
    it("should generate human-readable status messages", () => {
      const summary = createStatusSummary(mockEvents);
      const messages = generateStatusMessages(summary);

      expect(messages).toContain("Cleaned file (1 KB removed)");
      expect(messages).toContain("Created note");
      expect(messages).toContain(
        "Processed 5/10 ingredients (2 parsing errors found)"
      );
      expect(messages).toContain("Added 3 images (thumbnail, crop)");
      expect(messages).toContain("1 category added: Main");
      expect(messages).toContain("2 tags found: asian, japanese");
    });

    it("should handle missing information gracefully", () => {
      const summary = createStatusSummary([]);
      const messages = generateStatusMessages(summary);

      expect(messages).toContain("No category added");
      expect(messages).toContain("No tags added");
    });
  });

  describe("calculateProgress", () => {
    it("should calculate progress percentage correctly", () => {
      const progress = calculateProgress(mockEvents);
      expect(progress).toBe(50); // 2 completed out of 4 total events
    });

    it("should return 0 for empty events", () => {
      const progress = calculateProgress([]);
      expect(progress).toBe(0);
    });
  });

  describe("createProcessingSteps", () => {
    it("should create processing steps from events", () => {
      const steps = createProcessingSteps(mockEvents);

      expect(steps).toHaveLength(3); // file_cleaning, ingredient_processing, note_completion

      const fileCleaningStep = steps.find(
        (step) => step.id === "file_cleaning"
      );
      expect(fileCleaningStep?.status).toBe("completed");
      expect(fileCleaningStep?.name).toBe("File Cleaning");

      const ingredientStep = steps.find(
        (step) => step.id === "ingredient_processing"
      );
      expect(ingredientStep?.status).toBe("processing");
      expect(ingredientStep?.progress).toEqual({
        current: 5,
        total: 10,
        percentage: 50,
      });
    });

    it("should handle events without context", () => {
      const eventsWithUnknownContext = [
        {
          ...mockEvents[0],
          context: "unknown_context",
        },
      ];

      const steps = createProcessingSteps(eventsWithUnknownContext);
      expect(steps[0]?.name).toBe("Unknown Context");
    });
  });
});
