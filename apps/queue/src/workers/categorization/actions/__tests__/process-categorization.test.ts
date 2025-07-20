import { describe, it, expect, beforeEach, vi } from "vitest";
import { ProcessCategorizationAction } from "../process-categorization";
import { ActionContext } from "../../../core/types";

describe("ProcessCategorizationAction", () => {
  let action: ProcessCategorizationAction;
  let mockContext: ActionContext;

  beforeEach(() => {
    vi.clearAllMocks();

    mockContext = {
      jobId: "test-job-123",
      retryCount: 0,
      queueName: "test-queue",
      operation: "test-operation",
      startTime: Date.now(),
      workerName: "test-worker",
      attemptNumber: 1,
    };

    action = new ProcessCategorizationAction();
  });

  describe("execute", () => {
    it("should process categorization with Italian pasta recipe", async () => {
      const input = {
        noteId: "test-note-123",
        title: "Pasta Carbonara",
        content: "A classic Italian pasta dish with eggs and cheese",
        ingredients: ["spaghetti", "eggs", "pecorino cheese", "guanciale"],
        instructions: [
          "Boil pasta",
          "Mix eggs and cheese",
          "Combine with hot pasta",
        ],
      };

      const result = await action.execute(input, {}, mockContext);

      expect(result).toEqual({
        categories: ["Italian"],
        tags: [],
        analysis: {
          cuisine: "Unknown",
          difficulty: "medium",
          prepTime: "30 minutes",
          cookTime: "45 minutes",
          servings: 4,
        },
      });
    });

    it("should process categorization with Indian curry recipe", async () => {
      const input = {
        noteId: "test-note-456",
        title: "Curry Tikka Masala",
        content:
          "A creamy Indian curry with tender chicken. Grill the chicken first.",
        ingredients: ["chicken", "yogurt", "spices", "tomato sauce"],
        instructions: ["Marinate chicken", "Grill chicken", "Simmer in sauce"],
      };

      const result = await action.execute(input, {}, mockContext);

      expect(result).toEqual({
        categories: ["Indian"],
        tags: ["grilling"],
        analysis: {
          cuisine: "Unknown",
          difficulty: "medium",
          prepTime: "30 minutes",
          cookTime: "45 minutes",
          servings: 4,
        },
      });
    });

    it("should process categorization with Asian recipe using soy sauce", async () => {
      const input = {
        noteId: "test-note-789",
        title: "Stir Fry Vegetables",
        content: "Quick and healthy vegetable stir fry",
        ingredients: [
          "broccoli",
          "carrots",
          "soy sauce",
          "ginger",
          "vegetable oil",
        ],
        instructions: ["Heat oil", "Stir fry vegetables", "Add soy sauce"],
      };

      const result = await action.execute(input, {}, mockContext);

      expect(result).toEqual({
        categories: ["Asian"],
        tags: ["frying", "vegetarian"],
        analysis: {
          cuisine: "Unknown",
          difficulty: "medium",
          prepTime: "30 minutes",
          cookTime: "45 minutes",
          servings: 4,
        },
      });
    });

    it("should process categorization with breakfast recipe", async () => {
      const input = {
        noteId: "test-note-101",
        title: "Breakfast Omelette",
        content: "A fluffy omelette with vegetables",
        ingredients: ["eggs", "vegetables", "cheese"],
        instructions: ["Beat eggs", "Cook in pan", "Add fillings"],
      };

      const result = await action.execute(input, {}, mockContext);

      expect(result).toEqual({
        categories: ["General"],
        tags: ["vegetarian", "breakfast"],
        analysis: {
          cuisine: "Unknown",
          difficulty: "medium",
          prepTime: "30 minutes",
          cookTime: "45 minutes",
          servings: 4,
        },
      });
    });

    it("should process categorization with dessert recipe", async () => {
      const input = {
        noteId: "test-note-202",
        title: "Chocolate Cake Dessert",
        content: "A rich chocolate cake with frosting",
        ingredients: ["flour", "chocolate", "sugar", "eggs"],
        instructions: ["Mix ingredients", "Bake in oven", "Frost cake"],
      };

      const result = await action.execute(input, {}, mockContext);

      expect(result).toEqual({
        categories: ["General"],
        tags: ["dessert"],
        analysis: {
          cuisine: "Unknown",
          difficulty: "medium",
          prepTime: "30 minutes",
          cookTime: "45 minutes",
          servings: 4,
        },
      });
    });

    it("should process categorization with minimal input", async () => {
      const input = {
        noteId: "test-note-303",
        content: "Simple recipe",
      };

      const result = await action.execute(input, {}, mockContext);

      expect(result).toEqual({
        categories: ["General"],
        tags: [],
        analysis: {
          cuisine: "Unknown",
          difficulty: "medium",
          prepTime: "30 minutes",
          cookTime: "45 minutes",
          servings: 4,
        },
      });
    });

    it("should handle multiple cooking methods in content", async () => {
      const input = {
        noteId: "test-note-404",
        title: "Complex Recipe",
        content:
          "First bake the bread, then fry the vegetables, and finally grill the meat",
        ingredients: ["bread", "meat"],
        instructions: ["Bake bread", "Fry vegetables", "Grill meat"],
      };

      const result = await action.execute(input, {}, mockContext);

      expect(result).toEqual({
        categories: ["General"],
        tags: ["baking", "frying", "grilling"],
        analysis: {
          cuisine: "Unknown",
          difficulty: "medium",
          prepTime: "30 minutes",
          cookTime: "45 minutes",
          servings: 4,
        },
      });
    });

    it("should handle vegetarian ingredients", async () => {
      const input = {
        noteId: "test-note-505",
        title: "Vegetable Soup",
        content: "A hearty vegetable soup",
        ingredients: ["carrots", "celery", "vegetable broth", "onions"],
        instructions: ["Chop vegetables", "Simmer in broth"],
      };

      const result = await action.execute(input, {}, mockContext);

      expect(result).toEqual({
        categories: ["General"],
        tags: ["vegetarian"],
        analysis: {
          cuisine: "Unknown",
          difficulty: "medium",
          prepTime: "30 minutes",
          cookTime: "45 minutes",
          servings: 4,
        },
      });
    });

    it("should handle case-insensitive matching", async () => {
      const input = {
        noteId: "test-note-606",
        title: "PASTA CARBONARA",
        content: "BAKE the pasta and FRY the bacon",
        ingredients: ["PASTA", "VEGETABLE oil"],
        instructions: ["BOIL pasta", "FRY ingredients"],
      };

      const result = await action.execute(input, {}, mockContext);

      expect(result).toEqual({
        categories: ["Italian"],
        tags: ["baking", "frying", "vegetarian"],
        analysis: {
          cuisine: "Unknown",
          difficulty: "medium",
          prepTime: "30 minutes",
          cookTime: "45 minutes",
          servings: 4,
        },
      });
    });

    it("should handle error during processing", async () => {
      // Create a mock action that throws an error
      const errorAction = new ProcessCategorizationAction();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vi.spyOn(errorAction as any, "analyzeCategories").mockImplementation(
        () => {
          throw new Error("Analysis failed");
        }
      );

      const input = {
        noteId: "test-note-707",
        title: "Test Recipe",
        content: "Test content",
      };

      await expect(errorAction.execute(input, {}, mockContext)).rejects.toThrow(
        "Categorization processing failed: Error: Analysis failed"
      );
    });

    it("should handle empty strings gracefully", async () => {
      const input = {
        noteId: "test-note-808",
        title: "",
        content: "",
        ingredients: [],
        instructions: [],
      };

      const result = await action.execute(input, {}, mockContext);

      expect(result).toEqual({
        categories: ["General"],
        tags: [],
        analysis: {
          cuisine: "Unknown",
          difficulty: "medium",
          prepTime: "30 minutes",
          cookTime: "45 minutes",
          servings: 4,
        },
      });
    });
  });

  describe("action properties", () => {
    it("should have correct name", () => {
      expect(action.name).toBe("process-categorization");
    });

    it("should be retryable by default", () => {
      expect(action.retryable).toBe(true);
    });

    it("should have default priority", () => {
      expect(action.priority).toBe(0);
    });
  });

  describe("private methods", () => {
    it("should analyze categories correctly", () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = (action as any).analyzeCategories(
        "Pasta Carbonara",
        "Italian pasta dish",
        ["pasta", "eggs"]
      );
      expect(result).toEqual(["Italian"]);
    });

    it("should analyze tags correctly", () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = (action as any).analyzeTags(
        "Breakfast Omelette",
        "Bake the eggs and fry the vegetables",
        ["eggs", "vegetables"]
      );
      expect(result).toEqual(["baking", "frying", "vegetarian", "breakfast"]);
    });

    it("should analyze recipe details correctly", () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = (action as any).analyzeRecipeDetails();
      expect(result).toEqual({
        cuisine: "Unknown",
        difficulty: "medium",
        prepTime: "30 minutes",
        cookTime: "45 minutes",
        servings: 4,
      });
    });
  });
});
