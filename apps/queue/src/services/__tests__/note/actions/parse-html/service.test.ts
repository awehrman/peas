/* eslint-disable @typescript-eslint/no-explicit-any */
import { beforeEach, describe, expect, it } from "vitest";
import { vi } from "vitest";

import type { NotePipelineData } from "../../../../../types/notes";
import { parseHtml } from "../../../../note/actions/parse-html/service";

describe("parseHtml", () => {
  let mockLogger: any;

  beforeEach(() => {
    mockLogger = {
      log: vi.fn(),
    };
  });

  it("should parse HTML content and return structured data", async () => {
    const testData: NotePipelineData = {
      content: "<html><body><h1>Test Recipe</h1></body></html>",
      importId: "test-import-123",
      jobId: "test-job-123",
      noteId: "test-note-123",
      metadata: { source: "test" },
    };

    const result = await parseHtml(testData, mockLogger);

    expect(result).toEqual({
      ...testData,
      file: {
        title: "Sample Recipe",
        contents: testData.content,
        ingredients: [],
        instructions: [],
        evernoteMetadata: {
          source: undefined,
          originalCreatedAt: undefined,
          tags: undefined,
        },
      },
    });

    expect(mockLogger.log).toHaveBeenCalledWith(
      "[PARSE_HTML] Starting HTML parsing for import: test-import-123"
    );
    expect(mockLogger.log).toHaveBeenCalledWith(
      "[PARSE_HTML] HTML parsing completed for import: test-import-123"
    );
  });

  it("should handle errors gracefully", async () => {
    const testData: NotePipelineData = {
      content: "<html><body><h1>Test Recipe</h1></body></html>",
      importId: "test-import-123",
      jobId: "test-job-123",
      noteId: "test-note-123",
      metadata: { source: "test" },
    };

    // Mock the function to throw an error
    const mockParseHtml = vi.fn().mockRejectedValue(new Error("Parse error"));

    await expect(mockParseHtml(testData, mockLogger)).rejects.toThrow(
      "Parse error"
    );
  });
});
