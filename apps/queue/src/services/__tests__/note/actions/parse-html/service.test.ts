import { beforeEach, describe, expect, it, vi } from "vitest";

import type { StructuredLogger } from "../../../../../types";
import type { NotePipelineData } from "../../../../../types/notes";
import { parseHtml } from "../../../../note/actions/parse-html/service";

// Mock the HTML parser
vi.mock("../../../../../parsers/html", () => ({
  parseHTMLContent: vi.fn(),
}));

describe("Parse HTML Service", () => {
  let mockLogger: StructuredLogger;
  let mockParseHTMLContent: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.clearAllMocks();

    mockLogger = {
      log: vi.fn(),
    };

    const { parseHTMLContent } = await import("../../../../../parsers/html");
    mockParseHTMLContent = vi.mocked(parseHTMLContent);
  });

  describe("parseHtml", () => {
    it("should parse HTML content successfully", async () => {
      const mockData: NotePipelineData = {
        noteId: "test-note-123",
        importId: "test-import-123",
        content:
          '<html><head><meta itemprop="title" content="Test Recipe" /></head><body><h1>Test Recipe</h1></body></html>',
      };

      const mockParsedFile = {
        title: "Test Recipe",
        ingredients: [
          {
            reference: "1 cup flour",
            lineIndex: 0,
            parseStatus: "AWAITING_PARSING",
          },
          {
            reference: "2 tbsp butter",
            lineIndex: 1,
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
      };

      mockParseHTMLContent.mockReturnValue(mockParsedFile);

      const result = await parseHtml(mockData, mockLogger);

      // Verify that the service completed successfully
      expect(result).toEqual({
        ...mockData,
        file: expect.objectContaining({
          title: "Test Recipe",
          ingredients: expect.any(Array),
          instructions: expect.any(Array),
          contents: expect.any(String),
          evernoteMetadata: expect.any(Object),
        }),
      });

      // Verify that the service logged the expected messages
      expect(mockLogger.log).toHaveBeenCalledWith(
        "[PARSE_HTML] Starting HTML parsing for import: test-import-123"
      );
      expect(mockLogger.log).toHaveBeenCalledWith(
        "[PARSE_HTML] Parsing completed successfully"
      );
    });

    it("should handle parsing errors", async () => {
      const mockData: NotePipelineData = {
        noteId: "test-note-123",
        importId: "test-import-123",
        content: "<html><body><h1>Test Recipe</h1></body></html>",
      };

      const error = new Error("HTML file does not have a title");
      mockParseHTMLContent.mockImplementation(() => {
        throw error;
      });

      await expect(parseHtml(mockData, mockLogger)).rejects.toThrow(
        "HTML file does not have a title"
      );

      expect(mockLogger.log).toHaveBeenCalledWith(
        "[PARSE_HTML] HTML parsing failed: Error: HTML file does not have a title"
      );
    });

    it("should log parsing progress", async () => {
      const mockData: NotePipelineData = {
        noteId: "test-note-123",
        importId: "test-import-123",
        content:
          '<html><head><meta itemprop="title" content="Test Recipe" /></head><body><h1>Test Recipe</h1></body></html>',
      };

      const mockParsedFile = {
        title: "Test Recipe",
        ingredients: [
          {
            reference: "1 cup flour",
            lineIndex: 0,
            parseStatus: "AWAITING_PARSING",
          },
          {
            reference: "2 tbsp butter",
            lineIndex: 1,
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
      };

      mockParseHTMLContent.mockReturnValue(mockParsedFile);

      await parseHtml(mockData, mockLogger);

      expect(mockLogger.log).toHaveBeenCalledWith(
        "[PARSE_HTML] Starting HTML parsing for import: test-import-123"
      );
      expect(mockLogger.log).toHaveBeenCalledWith(
        "[PARSE_HTML] Content length: 106 characters"
      );
      expect(mockLogger.log).toHaveBeenCalledWith(
        '[PARSE_HTML] Content preview: <html><head><meta itemprop="title" content="Test Recipe" /></head><body><h1>Test Recipe</h1></body></html>...'
      );
      expect(mockLogger.log).toHaveBeenCalledWith(
        "[PARSE_HTML] Parsing completed successfully"
      );
      expect(mockLogger.log).toHaveBeenCalledWith(
        '[PARSE_HTML] Extracted title: "Test Recipe"'
      );
      expect(mockLogger.log).toHaveBeenCalledWith(
        "[PARSE_HTML] Found 2 ingredients"
      );
      expect(mockLogger.log).toHaveBeenCalledWith(
        "[PARSE_HTML] Found 1 instructions"
      );
    });

    it("should handle empty content", async () => {
      const mockData: NotePipelineData = {
        noteId: "test-note-123",
        importId: "test-import-123",
        content: "",
      };

      const error = new Error("HTML content is empty or invalid");
      mockParseHTMLContent.mockImplementation(() => {
        throw error;
      });

      await expect(parseHtml(mockData, mockLogger)).rejects.toThrow(
        "HTML content is empty or invalid"
      );

      expect(mockLogger.log).toHaveBeenCalledWith(
        "[PARSE_HTML] HTML parsing failed: Error: HTML content is empty or invalid"
      );
    });

    it("should handle undefined content", async () => {
      const mockData: NotePipelineData = {
        noteId: "test-note-123",
        importId: "test-import-123",
        content: undefined as unknown as string,
      };

      const error = new Error("HTML content is empty or invalid");
      mockParseHTMLContent.mockImplementation(() => {
        throw error;
      });

      await expect(parseHtml(mockData, mockLogger)).rejects.toThrow(
        "HTML content is empty or invalid"
      );

      expect(mockLogger.log).toHaveBeenCalledWith(
        "[PARSE_HTML] HTML parsing failed: Error: HTML content is empty or invalid"
      );
    });
  });
});
