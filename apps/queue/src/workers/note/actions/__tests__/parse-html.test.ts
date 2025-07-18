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

      expect(mockDeps.addStatusEventAndBroadcast).toHaveBeenCalledTimes(3);

      // Check start broadcast
      expect(mockDeps.addStatusEventAndBroadcast).toHaveBeenCalledWith({
        importId: "test-import-123",
        status: "PROCESSING",
        message: "HTML parsing started",
        context: "parse_html",
        indentLevel: 1,
      });

      // Check completion broadcast
      expect(mockDeps.addStatusEventAndBroadcast).toHaveBeenCalledWith({
        importId: "test-import-123",
        status: "COMPLETED",
        message: "HTML parsing completed (1 ingredients and 1 instructions)",
        context: "parse_html",
        indentLevel: 1,
        metadata: { noteTitle: "Test Recipe" },
      });

      // Check import complete broadcast
      expect(mockDeps.addStatusEventAndBroadcast).toHaveBeenCalledWith({
        importId: "test-import-123",
        status: "COMPLETED",
        message: "Note: Test Recipe",
        context: "import_complete",
        indentLevel: 0,
        metadata: { noteTitle: "Test Recipe" },
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
