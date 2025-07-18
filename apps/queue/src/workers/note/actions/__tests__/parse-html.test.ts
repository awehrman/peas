import { Queue } from "bullmq";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ParseHtmlAction } from "../parse-html";
import type { NoteWorkerDependencies } from "../../types";
import type { ParseHtmlData, ParsedHtmlFile } from "../../schema";
import type { ActionContext } from "../../../core/types";

describe("ParseHtmlAction", () => {
  let action: ParseHtmlAction;
  let mockDeps: NoteWorkerDependencies;
  let mockContext: ActionContext;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
    action = new ParseHtmlAction();
    mockDeps = {
      parseHTML: vi.fn(),
      createNote: vi.fn(),
      ingredientQueue: {} as Queue,
      instructionQueue: {} as Queue,
      imageQueue: {} as Queue,
      categorizationQueue: {} as Queue,
      sourceQueue: {} as Queue,
      addStatusEventAndBroadcast: vi.fn(),
      ErrorHandler: {
        withErrorHandling: vi.fn(),
      },
      logger: {
        log: vi.fn(),
      },
    };
    mockContext = {
      jobId: "test-job-123",
      retryCount: 0,
      queueName: "note-queue",
      operation: "parse_html",
      startTime: Date.now(),
      workerName: "test-worker",
      attemptNumber: 1,
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Constructor", () => {
    it("should create action with correct name", () => {
      expect(action.name).toBe("parse_html");
    });

    it("should have validation schema", () => {
      expect(action.schema).toBeDefined();
    });
  });

  describe("Validation", () => {
    it("should validate valid data", () => {
      const validData: ParseHtmlData = {
        content: "<html><body>Test content</body></html>",
      };

      const result = action.schema.safeParse(validData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validData);
      }
    });

    it("should reject empty content", () => {
      const invalidData = {
        content: "",
      };

      const result = action.schema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]!.message).toContain(
          "Content cannot be empty"
        );
      }
    });

    it("should reject missing content", () => {
      const invalidData = {};

      const result = action.schema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]!.message).toContain("expected string");
      }
    });

    it("should reject non-string content", () => {
      const invalidData = {
        content: 123,
      };

      const result = action.schema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]!.message).toContain("expected string");
      }
    });
  });

  describe("run", () => {
    it("should successfully parse HTML and return data with file", async () => {
      const inputData: ParseHtmlData = {
        content: "<html><body>Test content</body></html>",
      };

      const mockParsedFile: ParsedHtmlFile = {
        title: "Test Recipe",
        contents: "Test content",
        ingredients: [],
        instructions: [],
      };

      vi.mocked(mockDeps.parseHTML).mockResolvedValue(mockParsedFile);

      const result = await action.run(inputData, mockDeps, mockContext);

      expect(mockDeps.parseHTML).toHaveBeenCalledWith(inputData.content);
      expect(result).toEqual({
        ...inputData,
        file: mockParsedFile,
      });
    });

    it("should log start and success messages", async () => {
      const inputData: ParseHtmlData = {
        content: "<html><body>Test content</body></html>",
      };

      const mockParsedFile: ParsedHtmlFile = {
        title: "Test Recipe",
        contents: "Test content",
        ingredients: [
          {
            reference: "2 cups flour",
            blockIndex: 0,
            lineIndex: 0,
          },
        ],
        instructions: [
          {
            reference: "Mix ingredients",
            lineIndex: 0,
          },
        ],
      };

      vi.mocked(mockDeps.parseHTML).mockResolvedValue(mockParsedFile);

      await action.run(inputData, mockDeps, mockContext);

      expect(mockDeps.logger.log).toHaveBeenCalledWith(
        "[PARSE_HTML] Starting HTML parsing for job test-job-123"
      );

      expect(mockDeps.logger.log).toHaveBeenCalledWith(
        '[PARSE_HTML] Successfully parsed HTML for job test-job-123, title: "Test Recipe, ingredients: 1, instructions: 1"'
      );
    });

    it("should handle parseHTML errors", async () => {
      const inputData: ParseHtmlData = {
        content: "<html><body>Test content</body></html>",
      };

      const parseError = new Error("HTML parsing failed");
      vi.mocked(mockDeps.parseHTML).mockRejectedValue(parseError);

      await expect(
        action.run(inputData, mockDeps, mockContext)
      ).rejects.toThrow("HTML parsing failed");

      expect(mockDeps.logger.log).toHaveBeenCalledWith(
        "[PARSE_HTML] Starting HTML parsing for job test-job-123"
      );
    });

    it("should preserve all input data in output", async () => {
      const inputData: ParseHtmlData = {
        content: "<html><body>Test content</body></html>",
      };

      const mockParsedFile: ParsedHtmlFile = {
        title: "Test Recipe",
        contents: "Test content",
        ingredients: [],
        instructions: [],
      };

      vi.mocked(mockDeps.parseHTML).mockResolvedValue(mockParsedFile);

      const result = await action.run(inputData, mockDeps, mockContext);

      expect(result.content).toBe(inputData.content);
      expect(result.file).toBe(mockParsedFile);
    });

    it("should handle parsed file with empty ingredients and instructions", async () => {
      const inputData: ParseHtmlData = {
        content: "<html><body>Test content</body></html>",
      };

      const mockParsedFile: ParsedHtmlFile = {
        title: "Test Recipe",
        contents: "Test content",
        ingredients: [],
        instructions: [],
      };

      vi.mocked(mockDeps.parseHTML).mockResolvedValue(mockParsedFile);

      const result = await action.run(inputData, mockDeps, mockContext);

      expect(result.file.ingredients).toEqual([]);
      expect(result.file.instructions).toEqual([]);
      expect(mockDeps.logger.log).toHaveBeenCalledWith(
        '[PARSE_HTML] Successfully parsed HTML for job test-job-123, title: "Test Recipe, ingredients: 0, instructions: 0"'
      );
    });

    it("should broadcast start and completion status when importId is provided", async () => {
      const inputData: ParseHtmlData = {
        content: "<html><body>Test content</body></html>",
        importId: "test-import-123",
      };

      const mockParsedFile: ParsedHtmlFile = {
        title: "Test Recipe",
        contents: "Test content",
        ingredients: [
          {
            reference: "2 cups flour",
            blockIndex: 0,
            lineIndex: 0,
          },
        ],
        instructions: [
          {
            reference: "Mix ingredients",
            lineIndex: 0,
          },
        ],
      };

      vi.mocked(mockDeps.parseHTML).mockResolvedValue(mockParsedFile);

      await action.run(inputData, mockDeps, mockContext);

      expect(mockDeps.addStatusEventAndBroadcast).toHaveBeenCalledTimes(4);

      // Check start broadcast
      expect(mockDeps.addStatusEventAndBroadcast).toHaveBeenCalledWith({
        importId: "test-import-123",
        status: "PROCESSING",
        message: "Parsing HTML",
        context: "parse_html_start",
        indentLevel: 1,
      });

      // Check completion broadcast
      expect(mockDeps.addStatusEventAndBroadcast).toHaveBeenCalledWith({
        importId: "test-import-123",
        status: "COMPLETED",
        message: "Finished parsing HTML file.",
        context: "parse_html_complete",
        indentLevel: 1,
        metadata: { noteTitle: "Test Recipe" },
      });

      // Check ingredient count broadcast
      expect(mockDeps.addStatusEventAndBroadcast).toHaveBeenCalledWith({
        importId: "test-import-123",
        status: "PENDING",
        message: "0/1 ingredients",
        context: "parse_html_ingredients",
        indentLevel: 2,
        metadata: {
          totalIngredients: 1,
          processedIngredients: 0,
        },
      });

      // Check instruction count broadcast
      expect(mockDeps.addStatusEventAndBroadcast).toHaveBeenCalledWith({
        importId: "test-import-123",
        status: "PENDING",
        message: "0/1 instructions",
        context: "parse_html_instructions",
        indentLevel: 2,
        metadata: {
          totalInstructions: 1,
          processedInstructions: 0,
        },
      });
    });

    it("should not broadcast status when importId is not provided", async () => {
      const inputData: ParseHtmlData = {
        content: "<html><body>Test content</body></html>",
      };

      const mockParsedFile: ParsedHtmlFile = {
        title: "Test Recipe",
        contents: "Test content",
        ingredients: [],
        instructions: [],
      };

      vi.mocked(mockDeps.parseHTML).mockResolvedValue(mockParsedFile);

      await action.run(inputData, mockDeps, mockContext);

      expect(mockDeps.addStatusEventAndBroadcast).not.toHaveBeenCalled();
    });

    it("should handle broadcast start status errors gracefully", async () => {
      const inputData: ParseHtmlData = {
        content: "<html><body>Test content</body></html>",
        importId: "test-import-123",
      };

      const mockParsedFile: ParsedHtmlFile = {
        title: "Test Recipe",
        contents: "Test content",
        ingredients: [],
        instructions: [],
      };

      vi.mocked(mockDeps.parseHTML).mockResolvedValue(mockParsedFile);

      // Mock the start broadcast to fail
      vi.mocked(mockDeps.addStatusEventAndBroadcast)
        .mockRejectedValueOnce(new Error("Broadcast failed"))
        .mockResolvedValue(undefined);

      const result = await action.run(inputData, mockDeps, mockContext);

      // Should still complete successfully despite broadcast error
      expect(result).toEqual({
        ...inputData,
        file: mockParsedFile,
      });

      // Should log the broadcast error
      expect(mockDeps.logger.log).toHaveBeenCalledWith(
        "[PARSE_HTML] Failed to broadcast start status: Error: Broadcast failed"
      );

      // Should still attempt the completion broadcasts
      expect(mockDeps.addStatusEventAndBroadcast).toHaveBeenCalledTimes(4);
    });

    it("should handle broadcast completion status errors gracefully", async () => {
      const inputData: ParseHtmlData = {
        content: "<html><body>Test content</body></html>",
        importId: "test-import-123",
      };

      const mockParsedFile: ParsedHtmlFile = {
        title: "Test Recipe",
        contents: "Test content",
        ingredients: [
          {
            reference: "2 cups flour",
            blockIndex: 0,
            lineIndex: 0,
          },
        ],
        instructions: [
          {
            reference: "Mix ingredients",
            lineIndex: 0,
          },
        ],
      };

      vi.mocked(mockDeps.parseHTML).mockResolvedValue(mockParsedFile);

      // Mock the 4th broadcast call (completion broadcast) to fail
      let callCount = 0;
      vi.mocked(mockDeps.addStatusEventAndBroadcast).mockImplementation(
        async () => {
          callCount++;
          if (callCount === 4) {
            throw new Error("Broadcast failed");
          }
          return undefined;
        }
      );

      const result = await action.run(inputData, mockDeps, mockContext);

      // Should still complete successfully despite broadcast error
      expect(result).toEqual({
        ...inputData,
        file: mockParsedFile,
      });

      // Should log the broadcast error
      expect(console.error).toHaveBeenCalledWith(
        "[PARSE_HTML] Failed to broadcast completion status:",
        expect.any(Error)
      );

      // Should still attempt all broadcasts
      expect(mockDeps.addStatusEventAndBroadcast).toHaveBeenCalledTimes(4);
    });
  });

  describe("executeWithTiming", () => {
    it("should execute with timing and return result", async () => {
      const inputData: ParseHtmlData = {
        content: "<html><body>Test content</body></html>",
      };

      const mockParsedFile: ParsedHtmlFile = {
        title: "Test Recipe",
        contents: "Test content",
        ingredients: [],
        instructions: [],
      };

      // Add a small delay to ensure duration > 0
      vi.mocked(mockDeps.parseHTML).mockImplementation(async () => {
        await new Promise((resolve) => setTimeout(resolve, 5));
        return mockParsedFile;
      });

      const result = await action.executeWithTiming(
        inputData,
        mockDeps,
        mockContext
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({
          ...inputData,
          file: mockParsedFile,
        });
        expect(result.duration).toBeGreaterThan(0);
      }
    });

    it("should handle errors with timing", async () => {
      const inputData: ParseHtmlData = {
        content: "<html><body>Test content</body></html>",
      };

      const parseError = new Error("HTML parsing failed");

      // Add a small delay to ensure duration > 0
      vi.mocked(mockDeps.parseHTML).mockImplementation(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        throw parseError;
      });

      const result = await action.executeWithTiming(
        inputData,
        mockDeps,
        mockContext
      );

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe(parseError);
        expect(result.duration).toBeGreaterThan(0);
      }
    });
  });
});
