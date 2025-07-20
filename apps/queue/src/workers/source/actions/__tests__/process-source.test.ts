import { describe, it, expect, beforeEach, vi } from "vitest";
import { ProcessSourceAction } from "../process-source";
import { ActionContext } from "../../../core/types";
import type { ProcessSourceDeps } from "../types";

describe("ProcessSourceAction", () => {
  let action: ProcessSourceAction;
  let mockDeps: ProcessSourceDeps;
  let mockContext: ActionContext;

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock console.log to avoid noise in tests
    vi.spyOn(console, "log").mockImplementation(() => {});

    mockDeps = {
      sourceProcessor: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        processSource: vi.fn() as any,
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

    action = new ProcessSourceAction();
  });

  describe("execute", () => {
    it("should process source successfully with title", async () => {
      const input = {
        title: "Test Recipe",
        content: "This is a test recipe content",
        sourceId: "test-source-123",
      };

      const processedSource = {
        processedData: {
          title: "Processed Test Recipe",
          content: "Processed content",
          metadata: { difficulty: "easy" },
        },
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (mockDeps.sourceProcessor.processSource as any).mockResolvedValue(
        processedSource
      );

      const result = await action.execute(input, mockDeps, mockContext);

      expect(result).toEqual({
        ...input,
        source: processedSource,
      });

      expect(mockDeps.sourceProcessor.processSource).toHaveBeenCalledWith(
        input
      );
      expect(console.log).toHaveBeenCalledWith(
        "[TEST-OPERATION] Processing source: Test Recipe"
      );
      expect(console.log).toHaveBeenCalledWith(
        "[TEST-OPERATION] Source processing completed: Processed Test Recipe"
      );
    });

    it("should process source with untitled content", async () => {
      const input = {
        content: "This is content without a title",
        sourceId: "test-source-456",
      };

      const processedSource = {
        processedData: {
          title: "Untitled",
          content: "Processed content",
          metadata: {},
        },
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (mockDeps.sourceProcessor.processSource as any).mockResolvedValue(
        processedSource
      );

      const result = await action.execute(input, mockDeps, mockContext);

      expect(result).toEqual({
        ...input,
        source: processedSource,
      });

      expect(console.log).toHaveBeenCalledWith(
        "[TEST-OPERATION] Processing source: Untitled"
      );
      expect(console.log).toHaveBeenCalledWith(
        "[TEST-OPERATION] Source processing completed: Untitled"
      );
    });

    it("should process source with complex metadata", async () => {
      const input = {
        title: "Complex Recipe",
        content: "Complex recipe content",
        sourceId: "test-source-789",
        metadata: {
          author: "Chef John",
          cuisine: "Italian",
          difficulty: "medium",
        },
      };

      const processedSource = {
        processedData: {
          title: "Processed Complex Recipe",
          content: "Processed complex content",
          metadata: {
            author: "Chef John",
            cuisine: "Italian",
            difficulty: "medium",
            processedAt: "2024-01-01",
          },
        },
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (mockDeps.sourceProcessor.processSource as any).mockResolvedValue(
        processedSource
      );

      const result = await action.execute(input, mockDeps, mockContext);

      expect(result).toEqual({
        ...input,
        source: processedSource,
      });
    });

    it("should handle source processing error", async () => {
      const input = {
        title: "Error Recipe",
        content: "This will cause an error",
      };

      const processingError = new Error("Source processing failed");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (mockDeps.sourceProcessor.processSource as any).mockRejectedValue(
        processingError
      );

      await expect(
        action.execute(input, mockDeps, mockContext)
      ).rejects.toThrow("Source processing failed");

      expect(console.log).toHaveBeenCalledWith(
        "[TEST-OPERATION] Processing source: Error Recipe"
      );
    });

    it("should handle empty input", async () => {
      const input = {};

      const processedSource = {
        processedData: {
          title: "Untitled",
          content: "",
          metadata: {},
        },
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (mockDeps.sourceProcessor.processSource as any).mockResolvedValue(
        processedSource
      );

      const result = await action.execute(input, mockDeps, mockContext);

      expect(result).toEqual({
        ...input,
        source: processedSource,
      });
    });

    it("should handle source with unknown processed data structure", async () => {
      const input = {
        title: "Unknown Structure Recipe",
        content: "Test content",
      };

      const processedSource = {
        processedData: {
          unknownField: "unknown value",
        },
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (mockDeps.sourceProcessor.processSource as any).mockResolvedValue(
        processedSource
      );

      const result = await action.execute(input, mockDeps, mockContext);

      expect(result).toEqual({
        ...input,
        source: processedSource,
      });

      expect(console.log).toHaveBeenCalledWith(
        "[TEST-OPERATION] Source processing completed: Unknown"
      );
    });

    it("should handle source with null processed data", async () => {
      const input = {
        title: "Null Data Recipe",
        content: "Test content",
      };

      const processedSource = {
        processedData: null,
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (mockDeps.sourceProcessor.processSource as any).mockResolvedValue(
        processedSource
      );

      const result = await action.execute(input, mockDeps, mockContext);

      expect(result).toEqual({
        ...input,
        source: processedSource,
      });

      expect(console.log).toHaveBeenCalledWith(
        "[TEST-OPERATION] Source processing completed: Unknown"
      );
    });

    it("should handle source with undefined processed data", async () => {
      const input = {
        title: "Undefined Data Recipe",
        content: "Test content",
      };

      const processedSource = {
        processedData: undefined,
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (mockDeps.sourceProcessor.processSource as any).mockResolvedValue(
        processedSource
      );

      const result = await action.execute(input, mockDeps, mockContext);

      expect(result).toEqual({
        ...input,
        source: processedSource,
      });

      expect(console.log).toHaveBeenCalledWith(
        "[TEST-OPERATION] Source processing completed: Unknown"
      );
    });

    it("should handle very long title", async () => {
      const longTitle = "A".repeat(1000);
      const input = {
        title: longTitle,
        content: "Test content",
      };

      const processedSource = {
        processedData: {
          title: longTitle,
          content: "Processed content",
          metadata: {},
        },
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (mockDeps.sourceProcessor.processSource as any).mockResolvedValue(
        processedSource
      );

      const result = await action.execute(input, mockDeps, mockContext);

      expect(result).toEqual({
        ...input,
        source: processedSource,
      });
    });

    it("should handle special characters in title", async () => {
      const input = {
        title: "Recipe with special chars: !@#$%^&*()",
        content: "Test content",
      };

      const processedSource = {
        processedData: {
          title: "Processed Recipe with special chars: !@#$%^&*()",
          content: "Processed content",
          metadata: {},
        },
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (mockDeps.sourceProcessor.processSource as any).mockResolvedValue(
        processedSource
      );

      const result = await action.execute(input, mockDeps, mockContext);

      expect(result).toEqual({
        ...input,
        source: processedSource,
      });
    });

    it("should handle different operation names in context", async () => {
      const customContext = {
        ...mockContext,
        operation: "custom-operation",
      };

      const input = {
        title: "Custom Operation Recipe",
        content: "Test content",
      };

      const processedSource = {
        processedData: {
          title: "Processed Custom Operation Recipe",
          content: "Processed content",
          metadata: {},
        },
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (mockDeps.sourceProcessor.processSource as any).mockResolvedValue(
        processedSource
      );

      const result = await action.execute(input, mockDeps, customContext);

      expect(result).toEqual({
        ...input,
        source: processedSource,
      });

      expect(console.log).toHaveBeenCalledWith(
        "[CUSTOM-OPERATION] Processing source: Custom Operation Recipe"
      );
      expect(console.log).toHaveBeenCalledWith(
        "[CUSTOM-OPERATION] Source processing completed: Processed Custom Operation Recipe"
      );
    });
  });

  describe("action properties", () => {
    it("should have correct name", () => {
      expect(action.name).toBe("process_source");
    });

    it("should be retryable by default", () => {
      expect(action.retryable).toBe(true);
    });

    it("should have default priority", () => {
      expect(action.priority).toBe(0);
    });
  });

  describe("integration scenarios", () => {
    it("should handle multiple source processing operations", async () => {
      const sources = [
        { title: "Recipe 1", content: "Content 1" },
        { title: "Recipe 2", content: "Content 2" },
        { title: "Recipe 3", content: "Content 3" },
      ];

      const processedSources = sources.map((source, index) => ({
        processedData: {
          title: `Processed ${source.title}`,
          content: `Processed ${source.content}`,
          metadata: { index },
        },
      }));

      sources.forEach((_, index) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (mockDeps.sourceProcessor.processSource as any).mockResolvedValueOnce(
          processedSources[index]
        );
      });

      const results = await Promise.all(
        sources.map((source) => action.execute(source, mockDeps, mockContext))
      );

      expect(results).toHaveLength(3);
      results.forEach((result, index) => {
        expect(result.source).toEqual(processedSources[index]);
      });
    });
  });
});
