import { beforeEach, describe, expect, it, vi } from "vitest";

import { ActionName } from "../../../../../types";
import type {
  NotePipelineData,
  NoteWorkerDependencies,
} from "../../../../../types/notes";
import { BaseAction } from "../../../../../workers/core/base-action";
import { ActionContext } from "../../../../../workers/core/types";
import { ParseHtmlAction } from "../../../../note/actions/parse-html/action";

// Mock the parseHtml service
vi.mock("../../../../note/actions/parse-html/service", () => ({
  parseHtml: vi.fn(),
}));

// Mock the markWorkerCompleted function
vi.mock("../../../../note/actions/track-completion/service", () => ({
  markWorkerCompleted: vi.fn(),
}));

describe("ParseHtmlAction", () => {
  let action: ParseHtmlAction;
  let mockDependencies: NoteWorkerDependencies;
  let mockContext: ActionContext;
  let mockData: NotePipelineData;
  let mockParseHtml: ReturnType<typeof vi.fn>;
  let mockMarkWorkerCompleted: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.clearAllMocks();

    action = new ParseHtmlAction();

    const mockStatusBroadcaster = {
      addStatusEventAndBroadcast: vi.fn().mockResolvedValue({}),
    };

    mockDependencies = {
      logger: {
        log: vi.fn(),
      },
      statusBroadcaster: mockStatusBroadcaster,
      services: {
        parseHtml: vi.fn(),
        cleanHtml: vi.fn(),
        saveNote: vi.fn(),
      },
    } as NoteWorkerDependencies;

    mockContext = {
      jobId: "test-job-id",
      retryCount: 0,
      queueName: "test-queue",
      operation: "test-operation",
      startTime: Date.now(),
      workerName: "test-worker",
      attemptNumber: 1,
    };

    mockData = {
      noteId: "test-note-123",
      importId: "test-import-123",
      content: "<html><body><h1>Test Recipe</h1></body></html>",
      file: {
        title: "Test Recipe",
        ingredients: [
          {
            reference: "1 cup flour",
            lineIndex: 0,
            blockIndex: 0,
            parseStatus: "AWAITING_PARSING",
          },
          {
            reference: "2 tbsp butter",
            lineIndex: 1,
            blockIndex: 0,
            parseStatus: "AWAITING_PARSING",
          },
        ],
        instructions: [
          {
            reference: "Mix ingredients",
            lineIndex: 0,
            parseStatus: "AWAITING_PARSING",
          },
        ],
        contents: "Test content",
        evernoteMetadata: {},
      },
    };

    // Get the mocked functions
    const parseHtmlModule = await import(
      "../../../../note/actions/parse-html/service"
    );
    mockParseHtml = vi.mocked(parseHtmlModule.parseHtml);

    const trackCompletionModule = await import(
      "../../../../note/actions/track-completion/service"
    );
    mockMarkWorkerCompleted = vi.mocked(
      trackCompletionModule.markWorkerCompleted
    );

    // Setup default mock implementations
    mockParseHtml.mockResolvedValue(mockData);
    mockMarkWorkerCompleted.mockImplementation(() => {});
  });

  describe("name", () => {
    it("should have correct action name", () => {
      expect(action.name).toBe(ActionName.PARSE_HTML);
    });
  });

  describe("execute", () => {
    it("should execute parseHtml successfully", async () => {
      const result = await action.execute(
        mockData,
        mockDependencies,
        mockContext
      );

      expect(mockParseHtml).toHaveBeenCalledWith(
        mockData,
        mockDependencies.logger
      );
      expect(result).toEqual(mockData);
    });

    it("should broadcast status messages when statusBroadcaster is available", async () => {
      await action.execute(mockData, mockDependencies, mockContext);

      // Check ingredient status broadcast
      expect(
        mockDependencies.statusBroadcaster?.addStatusEventAndBroadcast
      ).toHaveBeenCalledWith({
        importId: "test-import-123",
        noteId: "test-note-123",
        status: "PROCESSING",
        message: "Processing 0/2 ingredients",
        context: "ingredient_processing",
        currentCount: 0,
        totalCount: 2,
        indentLevel: 2,
        metadata: {
          totalIngredients: 2,
          htmlFileName: undefined,
        },
      });

      // Check instruction status broadcast
      expect(
        mockDependencies.statusBroadcaster?.addStatusEventAndBroadcast
      ).toHaveBeenCalledWith({
        importId: "test-import-123",
        noteId: "test-note-123",
        status: "PROCESSING",
        message: "Processing 0/1 instructions",
        context: "instruction_processing",
        currentCount: 0,
        totalCount: 1,
        indentLevel: 2,
        metadata: {
          totalInstructions: 1,
          htmlFileName: undefined,
        },
      });
    });

    it("should not broadcast when statusBroadcaster is not available", async () => {
      const dependenciesWithoutBroadcaster = {
        ...mockDependencies,
        statusBroadcaster: undefined,
      };

      await action.execute(
        mockData,
        dependenciesWithoutBroadcaster,
        mockContext
      );

      expect(mockParseHtml).toHaveBeenCalledWith(
        mockData,
        mockDependencies.logger
      );
      expect(mockMarkWorkerCompleted).toHaveBeenCalledWith(
        "test-note-123",
        "note",
        mockDependencies.logger,
        undefined
      );
    });

    it("should not broadcast when result is null", async () => {
      mockParseHtml.mockResolvedValue(null as unknown as NotePipelineData);

      await action.execute(mockData, mockDependencies, mockContext);

      expect(
        mockDependencies.statusBroadcaster?.addStatusEventAndBroadcast
      ).not.toHaveBeenCalled();
    });

    it("should not broadcast when result.file is null", async () => {
      const resultWithoutFile = {
        ...mockData,
        file: null as unknown as NotePipelineData["file"],
      };
      mockParseHtml.mockResolvedValue(resultWithoutFile);

      await action.execute(mockData, mockDependencies, mockContext);

      expect(
        mockDependencies.statusBroadcaster?.addStatusEventAndBroadcast
      ).not.toHaveBeenCalled();
    });

    it("should not broadcast when data is null", async () => {
      mockParseHtml.mockResolvedValue(mockData);

      await action.execute(
        null as unknown as NotePipelineData,
        mockDependencies,
        mockContext
      );

      expect(
        mockDependencies.statusBroadcaster?.addStatusEventAndBroadcast
      ).not.toHaveBeenCalled();
    });

    it("should handle empty ingredients array", async () => {
      const dataWithNoIngredients = {
        ...mockData,
        file: {
          ...mockData.file,
          ingredients: [],
        },
      };
      mockParseHtml.mockResolvedValue(dataWithNoIngredients);

      await action.execute(mockData, mockDependencies, mockContext);

      // Should not broadcast ingredient status when there are no ingredients
      const ingredientBroadcasts = (
        mockDependencies.statusBroadcaster
          ?.addStatusEventAndBroadcast as ReturnType<typeof vi.fn>
      ).mock.calls.filter(
        (call: unknown[]) =>
          (call[0] as { context: string }).context === "ingredient_processing"
      );
      expect(ingredientBroadcasts).toHaveLength(0);
    });

    it("should handle empty instructions array", async () => {
      const dataWithNoInstructions = {
        ...mockData,
        file: {
          ...mockData.file,
          instructions: [],
        },
      };
      mockParseHtml.mockResolvedValue(dataWithNoInstructions);

      await action.execute(mockData, mockDependencies, mockContext);

      // Should not broadcast instruction status when there are no instructions
      const instructionBroadcasts = (
        mockDependencies.statusBroadcaster
          ?.addStatusEventAndBroadcast as ReturnType<typeof vi.fn>
      ).mock.calls.filter(
        (call: unknown[]) =>
          (call[0] as { context: string }).context === "instruction_processing"
      );
      expect(instructionBroadcasts).toHaveLength(0);
    });

    it("should handle undefined importId", async () => {
      const dataWithoutImportId = {
        ...mockData,
        importId: undefined,
      };
      mockParseHtml.mockResolvedValue(dataWithoutImportId);

      await action.execute(dataWithoutImportId, mockDependencies, mockContext);

      // Should use empty string for importId in broadcasts
      expect(
        mockDependencies.statusBroadcaster?.addStatusEventAndBroadcast
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          importId: "",
        })
      );
    });

    it("should mark worker as completed when noteId is available", async () => {
      await action.execute(mockData, mockDependencies, mockContext);

      expect(mockMarkWorkerCompleted).toHaveBeenCalledWith(
        "test-note-123",
        "note",
        mockDependencies.logger,
        mockDependencies.statusBroadcaster
      );
    });

    it("should not mark worker as completed when noteId is missing", async () => {
      const dataWithoutNoteId = {
        ...mockData,
        noteId: undefined,
      };
      mockParseHtml.mockResolvedValue(dataWithoutNoteId);

      await action.execute(dataWithoutNoteId, mockDependencies, mockContext);

      expect(mockMarkWorkerCompleted).not.toHaveBeenCalled();
    });

    it("should not mark worker as completed when data is null", async () => {
      mockParseHtml.mockResolvedValue(null as unknown as NotePipelineData);

      await action.execute(
        null as unknown as NotePipelineData,
        mockDependencies,
        mockContext
      );

      expect(mockMarkWorkerCompleted).not.toHaveBeenCalled();
    });

    it("should handle parseHtml errors", async () => {
      const error = new Error("HTML parsing failed");
      mockParseHtml.mockRejectedValue(error);

      await expect(
        action.execute(mockData, mockDependencies, mockContext)
      ).rejects.toThrow("HTML parsing failed");

      expect(mockMarkWorkerCompleted).not.toHaveBeenCalled();
    });

    it("should handle status broadcasting errors gracefully", async () => {
      (
        mockDependencies.statusBroadcaster!
          .addStatusEventAndBroadcast as ReturnType<typeof vi.fn>
      ).mockRejectedValue(new Error("Broadcast failed"));

      await expect(
        action.execute(mockData, mockDependencies, mockContext)
      ).rejects.toThrow("Broadcast failed");
    });

    it("should handle markWorkerCompleted errors gracefully", async () => {
      mockMarkWorkerCompleted.mockImplementation(() => {
        throw new Error("Worker completion failed");
      });

      await expect(
        action.execute(mockData, mockDependencies, mockContext)
      ).rejects.toThrow("Worker completion failed");
    });

    it("should not log execution details (logging is handled by BaseAction)", async () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      await action.execute(mockData, mockDependencies, mockContext);

      // ParseHtmlAction doesn't have explicit logging, it relies on BaseAction
      expect(consoleSpy).not.toHaveBeenCalledWith(
        expect.stringContaining("[PARSE_HTML_ACTION]")
      );

      consoleSpy.mockRestore();
    });
  });

  describe("inheritance", () => {
    it("should extend BaseAction", () => {
      expect(action).toBeInstanceOf(BaseAction);
    });

    it("should have correct generic types", () => {
      expect(action).toBeInstanceOf(ParseHtmlAction);
    });
  });
});
