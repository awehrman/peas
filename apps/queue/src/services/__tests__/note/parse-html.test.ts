import { beforeEach, describe, expect, it, vi } from "vitest";

import { createTestError } from "../../../test-utils/service";
import type {
  NotePipelineData,
  NoteWorkerDependencies,
} from "../../../types/notes";
import type { ActionContext } from "../../../workers/core/types";
import { ParseHtmlAction, parseHtmlFile } from "../../note/parse-html";

// Mock the HTML parsing function
const mockParseHTMLContent = vi.fn();

describe("ParseHtmlAction", () => {
  let mockDeps: NoteWorkerDependencies;
  let mockData: NotePipelineData;
  let mockContext: ActionContext;

  beforeEach(() => {
    vi.clearAllMocks();

    mockDeps = {
      logger: { log: vi.fn() },
      statusBroadcaster: { addStatusEventAndBroadcast: vi.fn() },
      services: {
        cleanHtml: vi.fn(),
        parseHtml: vi.fn(),
      },
    } as NoteWorkerDependencies;

    mockData = {
      content: "<html><body><h1>Test Recipe</h1><p>Content</p></body></html>",
      importId: "test-import-123",
      noteId: "test-note-456",
      source: {
        filename: "test-recipe.html",
        url: "https://example.com/recipe",
      },
    };

    mockContext = {
      jobId: "test-job-123",
      retryCount: 0,
      queueName: "note",
      noteId: "test-note-456",
      operation: "parse-html-test",
      startTime: Date.now(),
      workerName: "test-worker",
      attemptNumber: 1,
    };
  });

  describe("ParseHtmlAction class", () => {
    it("should have correct action name", () => {
      const action = new ParseHtmlAction();
      expect(action.name).toBe("parse_html");
    });

    it("should validate input successfully with valid data", () => {
      const action = new ParseHtmlAction();
      const validData = {
        content: "valid content",
        importId: "test-import",
      };

      const result = action.validateInput(validData as NotePipelineData);
      expect(result).toBeNull();
    });

    it("should validate input and return error with invalid data", () => {
      const action = new ParseHtmlAction();
      const invalidData = {
        content: "", // Empty content should fail validation
        importId: "test-import",
      };

      const result = action.validateInput(invalidData as NotePipelineData);
      expect(result).toBeInstanceOf(Error);
      expect(result?.message).toContain("Content cannot be empty");
    });

    it("should execute successfully with importId and status broadcaster", async () => {
      const action = new ParseHtmlAction();
      const parsedData = {
        ...mockData,
        file: {
          title: "Test Recipe",
          contents: mockData.content,
          ingredients: [
            { reference: "ingredient1", blockIndex: 0, lineIndex: 0 },
            { reference: "ingredient2", blockIndex: 0, lineIndex: 1 },
          ],
          instructions: [
            { reference: "instruction1", lineIndex: 0 },
            { reference: "instruction2", lineIndex: 1 },
          ],
        },
      };

      vi.mocked(mockDeps.services.parseHtml).mockResolvedValue(parsedData);
      if (mockDeps.statusBroadcaster?.addStatusEventAndBroadcast) {
        vi.mocked(
          mockDeps.statusBroadcaster.addStatusEventAndBroadcast
        ).mockResolvedValue({} as Record<string, unknown>);
      }

      const result = await action.execute(mockData, mockDeps, mockContext);

      expect(mockDeps.services.parseHtml).toHaveBeenCalledWith(mockData);
      expect(
        mockDeps.statusBroadcaster?.addStatusEventAndBroadcast
      ).toHaveBeenCalledTimes(4);

      // Check start status broadcast
      expect(
        mockDeps.statusBroadcaster?.addStatusEventAndBroadcast
      ).toHaveBeenCalledWith({
        importId: "test-import-123",
        status: "PROCESSING",
        message: "Parsing HTML",
        context: "parse_html_start",
        indentLevel: 1,
      });

      // Check completion status broadcast
      expect(
        mockDeps.statusBroadcaster?.addStatusEventAndBroadcast
      ).toHaveBeenCalledWith({
        importId: "test-import-123",
        status: "COMPLETED",
        message: "Finished parsing HTML file.",
        context: "parse_html_complete",
        indentLevel: 1,
        metadata: {
          noteTitle: "Test Recipe",
        },
      });

      // Check ingredient count status broadcast
      expect(
        mockDeps.statusBroadcaster?.addStatusEventAndBroadcast
      ).toHaveBeenCalledWith({
        importId: "test-import-123",
        status: "PENDING",
        message: "0/2 ingredients",
        context: "parse_html_ingredients",
        indentLevel: 2,
        metadata: {
          totalIngredients: 2,
          processedIngredients: 0,
        },
      });

      // Check instruction count status broadcast
      expect(
        mockDeps.statusBroadcaster?.addStatusEventAndBroadcast
      ).toHaveBeenCalledWith({
        importId: "test-import-123",
        status: "PENDING",
        message: "0/2 instructions",
        context: "parse_html_instructions",
        indentLevel: 2,
        metadata: {
          totalInstructions: 2,
          processedInstructions: 0,
        },
      });

      expect(result).toEqual(parsedData);
    });

    it("should execute successfully without importId", async () => {
      const action = new ParseHtmlAction();
      const dataWithoutImportId = { ...mockData };
      delete dataWithoutImportId.importId;
      const parsedData = {
        ...dataWithoutImportId,
        file: {
          title: "Test Recipe",
          contents: dataWithoutImportId.content,
          ingredients: [],
          instructions: [],
        },
      };

      vi.mocked(mockDeps.services.parseHtml).mockResolvedValue(parsedData);

      const result = await action.execute(
        dataWithoutImportId,
        mockDeps,
        mockContext
      );

      expect(mockDeps.services.parseHtml).toHaveBeenCalledWith(
        dataWithoutImportId
      );
      expect(
        mockDeps.statusBroadcaster?.addStatusEventAndBroadcast
      ).not.toHaveBeenCalled();
      expect(result).toEqual(parsedData);
    });

    it("should execute successfully without status broadcaster", async () => {
      const action = new ParseHtmlAction();
      const depsWithoutBroadcaster = { ...mockDeps };
      delete depsWithoutBroadcaster.statusBroadcaster;
      const parsedData = {
        ...mockData,
        file: {
          title: "Test Recipe",
          contents: mockData.content,
          ingredients: [],
          instructions: [],
        },
      };

      vi.mocked(mockDeps.services.parseHtml).mockResolvedValue(parsedData);

      const result = await action.execute(
        mockData,
        depsWithoutBroadcaster,
        mockContext
      );

      expect(mockDeps.services.parseHtml).toHaveBeenCalledWith(mockData);
      expect(result).toEqual(parsedData);
    });

    it("should execute successfully without file in result", async () => {
      const action = new ParseHtmlAction();
      const parsedDataWithoutFile = { ...mockData };
      // No file property in result

      vi.mocked(mockDeps.services.parseHtml).mockResolvedValue(
        parsedDataWithoutFile
      );
      if (mockDeps.statusBroadcaster?.addStatusEventAndBroadcast) {
        vi.mocked(
          mockDeps.statusBroadcaster.addStatusEventAndBroadcast
        ).mockResolvedValue({} as Record<string, unknown>);
      }

      const result = await action.execute(mockData, mockDeps, mockContext);

      expect(mockDeps.services.parseHtml).toHaveBeenCalledWith(mockData);
      // Should only call start status broadcast, not completion broadcasts
      expect(
        mockDeps.statusBroadcaster?.addStatusEventAndBroadcast
      ).toHaveBeenCalledTimes(1);
      expect(result).toEqual(parsedDataWithoutFile);
    });

    it("should handle start status broadcast error", async () => {
      const action = new ParseHtmlAction();
      const error = createTestError("Broadcast error");
      const parsedData = {
        ...mockData,
        file: {
          title: "Test Recipe",
          contents: mockData.content,
          ingredients: [],
          instructions: [],
        },
      };

      vi.mocked(mockDeps.services.parseHtml).mockResolvedValue(parsedData);
      if (mockDeps.statusBroadcaster?.addStatusEventAndBroadcast) {
        vi.mocked(
          mockDeps.statusBroadcaster.addStatusEventAndBroadcast
        ).mockRejectedValueOnce(error);
      }

      const result = await action.execute(mockData, mockDeps, mockContext);

      expect(mockDeps.logger.log).toHaveBeenCalledWith(
        "[PARSE_HTML] Failed to broadcast start status: Error: Broadcast error"
      );
      expect(mockDeps.services.parseHtml).toHaveBeenCalledWith(mockData);
      expect(result).toEqual(parsedData);
    });

    it("should handle completion status broadcast error", async () => {
      const action = new ParseHtmlAction();
      const error = createTestError("Broadcast error");
      const parsedData = {
        ...mockData,
        file: {
          title: "Test Recipe",
          contents: mockData.content,
          ingredients: [],
          instructions: [],
        },
      };

      vi.mocked(mockDeps.services.parseHtml).mockResolvedValue(parsedData);
      if (mockDeps.statusBroadcaster?.addStatusEventAndBroadcast) {
        vi.mocked(mockDeps.statusBroadcaster.addStatusEventAndBroadcast)
          .mockResolvedValueOnce({} as Record<string, unknown>)
          .mockRejectedValueOnce(error);
      }

      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      const result = await action.execute(mockData, mockDeps, mockContext);

      expect(consoleSpy).toHaveBeenCalledWith(
        "[PARSE-HTML-TEST] Failed to broadcast completion status:",
        error
      );
      expect(mockDeps.services.parseHtml).toHaveBeenCalledWith(mockData);
      expect(result).toEqual(parsedData);

      consoleSpy.mockRestore();
    });

    it("should handle service error", async () => {
      const action = new ParseHtmlAction();
      const error = createTestError("Service error");

      vi.mocked(mockDeps.services.parseHtml).mockRejectedValue(error);

      await expect(
        action.execute(mockData, mockDeps, mockContext)
      ).rejects.toThrow("Service error");
    });
  });

  describe("parseHtmlFile function", () => {
    it("should parse HTML content successfully", async () => {
      const mockParsedResult = {
        title: "Test Recipe",
        ingredients: [
          { reference: "ingredient1", blockIndex: 0, lineIndex: 0 },
          { reference: "ingredient2", blockIndex: 0, lineIndex: 1 },
        ],
        instructions: [
          { reference: "instruction1", lineIndex: 0 },
          { reference: "instruction2", lineIndex: 1 },
        ],
        image: "test-image.jpg",
        historicalCreatedAt: new Date("2023-01-01"),
        source: "test-source",
      };

      mockParseHTMLContent.mockReturnValue(mockParsedResult);

      const result = await parseHtmlFile(
        mockData,
        mockDeps.logger,
        mockParseHTMLContent
      );

      expect(mockParseHTMLContent).toHaveBeenCalledWith(mockData.content);
      expect(mockDeps.logger.log).toHaveBeenCalledWith(
        "[PARSE_HTML] Starting HTML parsing"
      );
      expect(mockDeps.logger.log).toHaveBeenCalledWith(
        '[PARSE_HTML] Successfully parsed HTML, title: "Test Recipe", ingredients: 2, instructions: 2"'
      );

      expect(result).toEqual({
        ...mockData,
        file: {
          title: "Test Recipe",
          contents: mockData.content,
          ingredients: [
            { reference: "ingredient1", blockIndex: 0, lineIndex: 0 },
            { reference: "ingredient2", blockIndex: 0, lineIndex: 1 },
          ],
          instructions: [
            { reference: "instruction1", lineIndex: 0 },
            { reference: "instruction2", lineIndex: 1 },
          ],
          image: "test-image.jpg",
          historicalCreatedAt: new Date("2023-01-01"),
          source: "test-source",
        },
      });
    });

    it("should handle parsing result with missing title", async () => {
      const mockParsedResult = {
        ingredients: [],
        instructions: [],
      };

      mockParseHTMLContent.mockReturnValue(mockParsedResult);

      const result = await parseHtmlFile(
        mockData,
        mockDeps.logger,
        mockParseHTMLContent
      );

      expect(result.file?.title).toBe("Untitled");
    });

    it("should handle parsing result with missing ingredients and instructions", async () => {
      const mockParsedResult = {
        title: "Test Recipe",
      };

      mockParseHTMLContent.mockReturnValue(mockParsedResult);

      const result = await parseHtmlFile(
        mockData,
        mockDeps.logger,
        mockParseHTMLContent
      );

      expect(result.file?.ingredients).toEqual([]);
      expect(result.file?.instructions).toEqual([]);
    });

    it("should handle parsing result with missing optional fields", async () => {
      const mockParsedResult = {
        title: "Test Recipe",
        ingredients: [],
        instructions: [],
      };

      mockParseHTMLContent.mockReturnValue(mockParsedResult);

      const result = await parseHtmlFile(
        mockData,
        mockDeps.logger,
        mockParseHTMLContent
      );

      expect(result.file?.image).toBe("");
      expect(result.file?.historicalCreatedAt).toBeUndefined();
      expect(result.file?.source).toBeUndefined();
    });

    it("should handle ingredients with missing blockIndex and lineIndex", async () => {
      const mockParsedResult = {
        title: "Test Recipe",
        ingredients: [
          { reference: "ingredient1" },
          { reference: "ingredient2" },
        ],
        instructions: [],
      };

      mockParseHTMLContent.mockReturnValue(mockParsedResult);

      const result = await parseHtmlFile(
        mockData,
        mockDeps.logger,
        mockParseHTMLContent
      );

      expect(result.file?.ingredients).toEqual([
        { reference: "ingredient1", blockIndex: 0, lineIndex: 0 },
        { reference: "ingredient2", blockIndex: 0, lineIndex: 1 },
      ]);
    });

    it("should handle instructions with missing lineIndex", async () => {
      const mockParsedResult = {
        title: "Test Recipe",
        ingredients: [],
        instructions: [
          { reference: "instruction1" },
          { reference: "instruction2" },
        ],
      };

      mockParseHTMLContent.mockReturnValue(mockParsedResult);

      const result = await parseHtmlFile(
        mockData,
        mockDeps.logger,
        mockParseHTMLContent
      );

      expect(result.file?.instructions).toEqual([
        { reference: "instruction1", lineIndex: 0 },
        { reference: "instruction2", lineIndex: 1 },
      ]);
    });

    it("should handle empty content", async () => {
      const dataWithEmptyContent = {
        ...mockData,
        content: "",
      };

      const mockParsedResult = {
        title: "Empty Recipe",
        ingredients: [],
        instructions: [],
      };

      mockParseHTMLContent.mockReturnValue(mockParsedResult);

      const result = await parseHtmlFile(
        dataWithEmptyContent,
        mockDeps.logger,
        mockParseHTMLContent
      );

      expect(mockParseHTMLContent).toHaveBeenCalledWith("");
      expect(result).toEqual({
        ...dataWithEmptyContent,
        file: {
          title: "Empty Recipe",
          contents: "",
          ingredients: [],
          instructions: [],
          image: "",
        },
      });
    });
  });
});
