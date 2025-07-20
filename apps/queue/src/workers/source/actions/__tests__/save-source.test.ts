import { describe, it, expect, beforeEach, vi } from "vitest";
import { SaveSourceAction } from "../save-source";
import { ActionContext } from "../../../core/types";
import type { SaveSourceDeps } from "../types";

describe("SaveSourceAction", () => {
  let action: SaveSourceAction;
  let mockDeps: SaveSourceDeps;
  let mockContext: ActionContext;

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock console.log to avoid noise in tests
    vi.spyOn(console, "log").mockImplementation(() => {});

    mockDeps = {
      database: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        saveSource: vi.fn() as any,
      },
    };

    mockContext = {
      jobId: "test-job-123",
      retryCount: 0,
      queueName: "test-queue",
      operation: "test-operation",
      startTime: Date.now(),
      workerName: "test-worker",
      attemptNumber: 1,
    };

    action = new SaveSourceAction();
  });

  describe("execute", () => {
    it("should save source successfully with title", async () => {
      const input = {
        sourceId: "test-source-123",
        source: {
          processedData: {
            title: "Test Recipe",
            content: "This is a test recipe content",
            metadata: { difficulty: "easy" },
          },
        },
      };

      const savedSource = {
        id: "saved-source-456",
        title: "Test Recipe",
        content: "This is a test recipe content",
        metadata: { difficulty: "easy" },
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (mockDeps.database.saveSource as any).mockResolvedValue(savedSource);

      const result = await action.execute(input, mockDeps, mockContext);

      expect(result).toEqual({
        ...input,
        sourceId: savedSource.id,
        savedSource,
      });

      expect(mockDeps.database.saveSource).toHaveBeenCalledWith(
        input.source.processedData
      );
      expect(console.log).toHaveBeenCalledWith(
        "[TEST-OPERATION] Saving source: Test Recipe"
      );
      expect(console.log).toHaveBeenCalledWith(
        "[TEST-OPERATION] Source saved successfully: saved-source-456"
      );
    });

    it("should save source with untitled content", async () => {
      const input = {
        sourceId: "test-source-456",
        source: {
          processedData: {
            title: "",
            content: "Content without title",
            metadata: {},
          },
        },
      };

      const savedSource = {
        id: "saved-source-789",
        title: "Untitled",
        content: "Content without title",
        metadata: {},
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (mockDeps.database.saveSource as any).mockResolvedValue(savedSource);

      const result = await action.execute(input, mockDeps, mockContext);

      expect(result).toEqual({
        ...input,
        sourceId: savedSource.id,
        savedSource,
      });

      expect(console.log).toHaveBeenCalledWith(
        "[TEST-OPERATION] Saving source: Untitled"
      );
    });

    it("should save source with complex metadata", async () => {
      const input = {
        sourceId: "test-source-789",
        source: {
          processedData: {
            title: "Complex Recipe",
            content: "Complex recipe content",
            metadata: {
              author: "Chef John",
              cuisine: "Italian",
              difficulty: "medium",
              prepTime: "30 minutes",
              cookTime: "45 minutes",
              servings: 4,
            },
          },
        },
      };

      const savedSource = {
        id: "saved-source-101",
        title: "Complex Recipe",
        content: "Complex recipe content",
        metadata: {
          author: "Chef John",
          cuisine: "Italian",
          difficulty: "medium",
          prepTime: "30 minutes",
          cookTime: "45 minutes",
          servings: 4,
        },
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (mockDeps.database.saveSource as any).mockResolvedValue(savedSource);

      const result = await action.execute(input, mockDeps, mockContext);

      expect(result).toEqual({
        ...input,
        sourceId: savedSource.id,
        savedSource,
      });
    });

    it("should handle database save error", async () => {
      const input = {
        sourceId: "test-source-202",
        source: {
          processedData: {
            title: "Error Recipe",
            content: "This will cause an error",
            metadata: {},
          },
        },
      };

      const saveError = new Error("Database connection failed");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (mockDeps.database.saveSource as any).mockRejectedValue(saveError);

      await expect(
        action.execute(input, mockDeps, mockContext)
      ).rejects.toThrow("Database connection failed");

      expect(console.log).toHaveBeenCalledWith(
        "[TEST-OPERATION] Saving source: Error Recipe"
      );
    });

    it("should handle source with missing title", async () => {
      const input = {
        sourceId: "test-source-303",
        source: {
          processedData: {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            title: undefined as any,
            content: "Content without title",
            metadata: {},
          },
        },
      };

      const savedSource = {
        id: "saved-source-404",
        content: "Content without title",
        metadata: {},
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (mockDeps.database.saveSource as any).mockResolvedValue(savedSource);

      const result = await action.execute(input, mockDeps, mockContext);

      expect(result).toEqual({
        ...input,
        sourceId: savedSource.id,
        savedSource,
      });

      expect(console.log).toHaveBeenCalledWith(
        "[TEST-OPERATION] Saving source: Untitled"
      );
    });

    it("should handle source with null processed data", async () => {
      const input = {
        sourceId: "test-source-505",
        source: {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          processedData: null as any,
        },
      };

      const savedSource = {
        id: "saved-source-606",
        processedData: null,
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (mockDeps.database.saveSource as any).mockResolvedValue(savedSource);

      const result = await action.execute(input, mockDeps, mockContext);

      expect(result).toEqual({
        ...input,
        sourceId: savedSource.id,
        savedSource,
      });

      expect(console.log).toHaveBeenCalledWith(
        "[TEST-OPERATION] Saving source: Untitled"
      );
    });

    it("should handle source with undefined processed data", async () => {
      const input = {
        sourceId: "test-source-707",
        source: {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          processedData: undefined as any,
        },
      };

      const savedSource = {
        id: "saved-source-808",
        processedData: undefined,
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (mockDeps.database.saveSource as any).mockResolvedValue(savedSource);

      const result = await action.execute(input, mockDeps, mockContext);

      expect(result).toEqual({
        ...input,
        sourceId: savedSource.id,
        savedSource,
      });

      expect(console.log).toHaveBeenCalledWith(
        "[TEST-OPERATION] Saving source: Untitled"
      );
    });

    it("should handle very long title", async () => {
      const longTitle = "A".repeat(1000);
      const input = {
        sourceId: "test-source-909",
        source: {
          processedData: {
            title: longTitle,
            content: "Test content",
            metadata: {},
          },
        },
      };

      const savedSource = {
        id: "saved-source-1010",
        title: longTitle,
        content: "Test content",
        metadata: {},
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (mockDeps.database.saveSource as any).mockResolvedValue(savedSource);

      const result = await action.execute(input, mockDeps, mockContext);

      expect(result).toEqual({
        ...input,
        sourceId: savedSource.id,
        savedSource,
      });
    });

    it("should handle special characters in title", async () => {
      const input = {
        sourceId: "test-source-1111",
        source: {
          processedData: {
            title: "Recipe with special chars: !@#$%^&*()",
            content: "Test content",
            metadata: {},
          },
        },
      };

      const savedSource = {
        id: "saved-source-1212",
        title: "Recipe with special chars: !@#$%^&*()",
        content: "Test content",
        metadata: {},
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (mockDeps.database.saveSource as any).mockResolvedValue(savedSource);

      const result = await action.execute(input, mockDeps, mockContext);

      expect(result).toEqual({
        ...input,
        sourceId: savedSource.id,
        savedSource,
      });
    });

    it("should handle different operation names in context", async () => {
      const customContext = {
        ...mockContext,
        operation: "custom-operation",
      };

      const input = {
        sourceId: "test-source-1313",
        source: {
          processedData: {
            title: "Custom Operation Recipe",
            content: "Test content",
            metadata: {},
          },
        },
      };

      const savedSource = {
        id: "saved-source-1414",
        title: "Custom Operation Recipe",
        content: "Test content",
        metadata: {},
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (mockDeps.database.saveSource as any).mockResolvedValue(savedSource);

      const result = await action.execute(input, mockDeps, customContext);

      expect(result).toEqual({
        ...input,
        sourceId: savedSource.id,
        savedSource,
      });

      expect(console.log).toHaveBeenCalledWith(
        "[CUSTOM-OPERATION] Saving source: Custom Operation Recipe"
      );
      expect(console.log).toHaveBeenCalledWith(
        "[CUSTOM-OPERATION] Source saved successfully: saved-source-1414"
      );
    });

    it("should handle saved source without id", async () => {
      const input = {
        sourceId: "test-source-1515",
        source: {
          processedData: {
            title: "Recipe without ID",
            content: "Test content",
            metadata: {},
          },
        },
      };

      const savedSource = {
        title: "Recipe without ID",
        content: "Test content",
        metadata: {},
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (mockDeps.database.saveSource as any).mockResolvedValue(savedSource);

      const result = await action.execute(input, mockDeps, mockContext);

      expect(result).toEqual({
        ...input,
        sourceId: undefined,
        savedSource,
      });

      expect(console.log).toHaveBeenCalledWith(
        "[TEST-OPERATION] Source saved successfully: undefined"
      );
    });
  });

  describe("action properties", () => {
    it("should have correct name", () => {
      expect(action.name).toBe("save_source");
    });

    it("should be retryable by default", () => {
      expect(action.retryable).toBe(true);
    });

    it("should have default priority", () => {
      expect(action.priority).toBe(0);
    });
  });

  describe("integration scenarios", () => {
    it("should handle multiple source save operations", async () => {
      const sources = [
        {
          sourceId: "test-source-1",
          source: {
            processedData: {
              title: "Recipe 1",
              content: "Content 1",
              metadata: { index: 1 },
            },
          },
        },
        {
          sourceId: "test-source-2",
          source: {
            processedData: {
              title: "Recipe 2",
              content: "Content 2",
              metadata: { index: 2 },
            },
          },
        },
        {
          sourceId: "test-source-3",
          source: {
            processedData: {
              title: "Recipe 3",
              content: "Content 3",
              metadata: { index: 3 },
            },
          },
        },
      ];

      const savedSources = sources.map((source, index) => ({
        id: `saved-source-${index + 1}`,
        title: source.source.processedData.title,
        content: source.source.processedData.content,
        metadata: source.source.processedData.metadata,
      }));

      sources.forEach((_, index) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (mockDeps.database.saveSource as any).mockResolvedValueOnce(
          savedSources[index]
        );
      });

      const results = await Promise.all(
        sources.map((source) => action.execute(source, mockDeps, mockContext))
      );

      expect(results).toHaveLength(3);
      results.forEach((result, index) => {
        expect(result.savedSource).toEqual(savedSources[index]);
        expect(result.sourceId).toBe(savedSources[index]?.id);
      });
    });
  });
});
