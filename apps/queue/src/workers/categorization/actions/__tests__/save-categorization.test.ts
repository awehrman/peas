import { describe, it, expect, beforeEach, vi } from "vitest";
import { SaveCategorizationAction } from "../save-categorization";
import { ActionContext } from "../../../core/types";

describe("SaveCategorizationAction", () => {
  let action: SaveCategorizationAction;
  let mockContext: ActionContext;

  const mockCategorization = {
    categories: ["Italian", "Pasta"],
    tags: ["baking", "vegetarian"],
    analysis: {
      cuisine: "Italian",
      difficulty: "medium" as const,
      prepTime: "30 minutes",
      cookTime: "45 minutes",
      servings: 4,
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock console.log to avoid noise in tests
    vi.spyOn(console, "log").mockImplementation(() => {});

    mockContext = {
      jobId: "test-job-123",
      retryCount: 0,
      queueName: "test-queue",
      operation: "test-operation",
      startTime: Date.now(),
      workerName: "test-worker",
      attemptNumber: 1,
    };

    action = new SaveCategorizationAction();
  });

  describe("execute", () => {
    it("should save categorization successfully", async () => {
      const input = {
        noteId: "test-note-123",
        categorization: mockCategorization,
      };

      const result = await action.execute(input, {}, mockContext);

      expect(result).toEqual({
        success: true,
        categoriesSaved: 2,
        tagsSaved: 2,
      });

      expect(console.log).toHaveBeenCalledWith(
        "Saving categorization for note test-note-123:",
        {
          categories: ["Italian", "Pasta"],
          tags: ["baking", "vegetarian"],
        }
      );
    });

    it("should handle categorization with no categories", async () => {
      const input = {
        noteId: "test-note-456",
        categorization: {
          ...mockCategorization,
          categories: [],
        },
      };

      const result = await action.execute(input, {}, mockContext);

      expect(result).toEqual({
        success: true,
        categoriesSaved: 0,
        tagsSaved: 2,
      });
    });

    it("should handle categorization with no tags", async () => {
      const input = {
        noteId: "test-note-789",
        categorization: {
          ...mockCategorization,
          tags: [],
        },
      };

      const result = await action.execute(input, {}, mockContext);

      expect(result).toEqual({
        success: true,
        categoriesSaved: 2,
        tagsSaved: 0,
      });
    });

    it("should handle categorization with no categories or tags", async () => {
      const input = {
        noteId: "test-note-101",
        categorization: {
          ...mockCategorization,
          categories: [],
          tags: [],
        },
      };

      const result = await action.execute(input, {}, mockContext);

      expect(result).toEqual({
        success: true,
        categoriesSaved: 0,
        tagsSaved: 0,
      });
    });

    it("should handle large number of categories and tags", async () => {
      const input = {
        noteId: "test-note-202",
        categorization: {
          ...mockCategorization,
          categories: [
            "Italian",
            "Pasta",
            "Mediterranean",
            "European",
            "Traditional",
          ],
          tags: [
            "baking",
            "vegetarian",
            "quick",
            "healthy",
            "gluten-free",
            "dairy-free",
          ],
        },
      };

      const result = await action.execute(input, {}, mockContext);

      expect(result).toEqual({
        success: true,
        categoriesSaved: 5,
        tagsSaved: 6,
      });
    });

    it("should handle categorization with minimal analysis", async () => {
      const input = {
        noteId: "test-note-303",
        categorization: {
          categories: ["General"],
          tags: ["quick"],
          analysis: undefined,
        },
      };

      const result = await action.execute(input, {}, mockContext);

      expect(result).toEqual({
        success: true,
        categoriesSaved: 1,
        tagsSaved: 1,
      });
    });

    it("should handle error during save operation", async () => {
      // Create a mock action that throws an error
      const errorAction = new SaveCategorizationAction();
      vi.spyOn(console, "log").mockImplementation(() => {
        throw new Error("Database connection failed");
      });

      const input = {
        noteId: "test-note-404",
        categorization: mockCategorization,
      };

      await expect(errorAction.execute(input, {}, mockContext)).rejects.toThrow(
        "Failed to save categorization: Error: Database connection failed"
      );
    });

    it("should handle empty noteId", async () => {
      const input = {
        noteId: "",
        categorization: mockCategorization,
      };

      const result = await action.execute(input, {}, mockContext);

      expect(result).toEqual({
        success: true,
        categoriesSaved: 2,
        tagsSaved: 2,
      });

      expect(console.log).toHaveBeenCalledWith(
        "Saving categorization for note :",
        {
          categories: ["Italian", "Pasta"],
          tags: ["baking", "vegetarian"],
        }
      );
    });

    it("should handle special characters in noteId", async () => {
      const input = {
        noteId: "test-note-505-with-special-chars!@#$%",
        categorization: mockCategorization,
      };

      const result = await action.execute(input, {}, mockContext);

      expect(result).toEqual({
        success: true,
        categoriesSaved: 2,
        tagsSaved: 2,
      });

      expect(console.log).toHaveBeenCalledWith(
        "Saving categorization for note test-note-505-with-special-chars!@#$%:",
        {
          categories: ["Italian", "Pasta"],
          tags: ["baking", "vegetarian"],
        }
      );
    });

    it("should handle very long noteId", async () => {
      const longNoteId = "a".repeat(1000);
      const input = {
        noteId: longNoteId,
        categorization: mockCategorization,
      };

      const result = await action.execute(input, {}, mockContext);

      expect(result).toEqual({
        success: true,
        categoriesSaved: 2,
        tagsSaved: 2,
      });
    });
  });

  describe("action properties", () => {
    it("should have correct name", () => {
      expect(action.name).toBe("save-categorization");
    });

    it("should be retryable by default", () => {
      expect(action.retryable).toBe(true);
    });

    it("should have default priority", () => {
      expect(action.priority).toBe(0);
    });
  });

  describe("integration scenarios", () => {
    it("should handle complete categorization workflow", async () => {
      const categorizations = [
        {
          noteId: "test-note-801",
          categorization: {
            categories: ["Italian"],
            tags: ["pasta"],
            analysis: { cuisine: "Italian", difficulty: "easy" as const },
          },
        },
        {
          noteId: "test-note-802",
          categorization: {
            categories: ["Asian", "Chinese"],
            tags: ["stir-fry", "quick"],
            analysis: { cuisine: "Chinese", difficulty: "medium" as const },
          },
        },
        {
          noteId: "test-note-803",
          categorization: {
            categories: ["Dessert"],
            tags: ["sweet", "baking"],
            analysis: { cuisine: "American", difficulty: "hard" as const },
          },
        },
      ];

      const results = await Promise.all(
        categorizations.map((input) => action.execute(input, {}, mockContext))
      );

      expect(results).toEqual([
        { success: true, categoriesSaved: 1, tagsSaved: 1 },
        { success: true, categoriesSaved: 2, tagsSaved: 2 },
        { success: true, categoriesSaved: 1, tagsSaved: 2 },
      ]);
    });
  });
});
