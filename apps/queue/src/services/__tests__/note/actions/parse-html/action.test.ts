/* eslint-disable @typescript-eslint/no-explicit-any */
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ActionName } from "../../../../../types";
import type { NotePipelineData } from "../../../../../types/notes";
import type { NoteWorkerDependencies } from "../../../../../types/notes";
import type { ActionContext } from "../../../../../workers/core/types";
import { ParseHtmlAction } from "../../../../note/actions/parse-html/action";

// Mock the schema
vi.mock("../../../../../schemas/note", () => ({
  ParseHtmlDataSchema: {
    parse: vi.fn(),
  },
}));

// Mock the service
vi.mock("../../../../note/actions/parse-html/service", () => ({
  parseHtml: vi.fn(),
}));

describe("ParseHtmlAction", () => {
  let action: ParseHtmlAction;
  let mockData: NotePipelineData;
  let mockDeps: NoteWorkerDependencies;
  let mockContext: ActionContext;
  let mockParseHtmlDataSchema: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    // Clear all mocks
    vi.clearAllMocks();

    // Create action instance
    action = new ParseHtmlAction();

    // Create mock data
    mockData = {
      content:
        "<html><body><h1>Test Recipe</h1><ul><li>Ingredient 1</li><li>Ingredient 2</li></ul><ol><li>Step 1</li><li>Step 2</li></ol></body></html>",
      jobId: "test-job-123",
      noteId: "test-note-456",
      importId: "test-import-789",
      metadata: { source: "test" },
    };

    // Create mock dependencies
    mockDeps = {
      services: {
        parseHtml: vi.fn(),
        cleanHtml: vi.fn(),
        saveNote: vi.fn(),
      },
      logger: {
        log: vi.fn(),
      },
      statusBroadcaster: {
        addStatusEventAndBroadcast: vi.fn(),
      },
    } as NoteWorkerDependencies;

    // Create mock context
    mockContext = {
      jobId: "test-job-123",
      queueName: "notes",
      retryCount: 0,
      startTime: Date.now(),
      operation: "parse_html",
      workerName: "test-worker",
      attemptNumber: 1,
    };

    // Get mocked schema
    const schemaModule = await import("../../../../../schemas/note");
    mockParseHtmlDataSchema = vi.mocked(schemaModule.ParseHtmlDataSchema.parse);

    // Setup default mock implementations
    mockParseHtmlDataSchema.mockReturnValue(mockData);

    // Mock the parseHtml function from the service module
    const { parseHtml } = await import(
      "../../../../note/actions/parse-html/service"
    );
    vi.mocked(parseHtml).mockResolvedValue(mockData);
  });

  describe("name", () => {
    it("should have the correct action name", () => {
      expect(action.name).toBe(ActionName.PARSE_HTML);
    });
  });

  describe("execute", () => {
    it("should execute the service action with correct parameters", async () => {
      const result = await action.execute(mockData, mockDeps, mockContext);

      expect(result).toBe(mockData);
    });

    it("should call parseHtml with correct parameters", async () => {
      // Mock the parseHtml function from the service module
      const { parseHtml } = await import(
        "../../../../note/actions/parse-html/service"
      );
      const parseHtmlSpy = vi.mocked(parseHtml);

      await action.execute(mockData, mockDeps, mockContext);

      expect(parseHtmlSpy).toHaveBeenCalledWith(mockData, mockDeps.logger);
    });

    it("should handle service call correctly", async () => {
      const parsedData = {
        ...mockData,
        file: {
          title: "Parsed Recipe",
          contents: mockData.content,
          ingredients: [],
          instructions: [],
        },
      };

      // Mock the parseHtml function from the service module
      const { parseHtml } = await import(
        "../../../../note/actions/parse-html/service"
      );
      vi.mocked(parseHtml).mockResolvedValue(parsedData);

      const result = await action.execute(mockData, mockDeps, mockContext);

      expect(result).toBe(parsedData);
    });

    it("should handle complex parsed data", async () => {
      const parsedData = {
        ...mockData,
        file: {
          title: "Test Recipe",
          contents: mockData.content,
          ingredients: [
            { reference: "Ingredient 1", blockIndex: 0, lineIndex: 0 },
            { reference: "Ingredient 2", blockIndex: 0, lineIndex: 1 },
          ],
          instructions: [
            { reference: "Step 1", lineIndex: 0 },
            { reference: "Step 2", lineIndex: 1 },
          ],
        },
      };

      // Mock the parseHtml function from the service module
      const { parseHtml } = await import(
        "../../../../note/actions/parse-html/service"
      );
      vi.mocked(parseHtml).mockResolvedValue(parsedData);

      const result = await action.execute(mockData, mockDeps, mockContext);

      expect(result).toBe(parsedData);
    });

    it("should handle data without importId", async () => {
      const dataWithoutImportId = {
        ...mockData,
        importId: undefined,
      };
      const parsedData = {
        ...dataWithoutImportId,
        file: {
          title: "Test Recipe",
          contents: mockData.content,
          ingredients: [],
          instructions: [],
        },
      };

      // Mock the parseHtml function from the service module
      const { parseHtml } = await import(
        "../../../../note/actions/parse-html/service"
      );
      vi.mocked(parseHtml).mockResolvedValue(parsedData);

      const result = await action.execute(dataWithoutImportId, mockDeps, mockContext);

      expect(result).toBe(parsedData);
    });

    it("should handle dependencies without statusBroadcaster", async () => {
      const depsWithoutBroadcaster = {
        ...mockDeps,
        statusBroadcaster: undefined,
      } as NoteWorkerDependencies;
      const parsedData = {
        ...mockData,
        file: {
          title: "Test Recipe",
          contents: mockData.content,
          ingredients: [],
          instructions: [],
        },
      };

      // Mock the parseHtml function from the service module
      const { parseHtml } = await import(
        "../../../../note/actions/parse-html/service"
      );
      vi.mocked(parseHtml).mockResolvedValue(parsedData);

      const result = await action.execute(mockData, depsWithoutBroadcaster, mockContext);

      expect(result).toBe(parsedData);
    });

    it("should handle empty ingredients and instructions arrays", async () => {
      const parsedData = {
        ...mockData,
        file: {
          title: "Test Recipe",
          contents: mockData.content,
          ingredients: [],
          instructions: [],
        },
      };

      // Mock the parseHtml function from the service module
      const { parseHtml } = await import(
        "../../../../note/actions/parse-html/service"
      );
      vi.mocked(parseHtml).mockResolvedValue(parsedData);

      const result = await action.execute(mockData, mockDeps, mockContext);

      expect(result).toBe(parsedData);
    });

    it("should handle undefined ingredients and instructions", async () => {
      const parsedData = {
        ...mockData,
        file: {
          title: "Test Recipe",
          contents: mockData.content,
          ingredients: [],
          instructions: [],
        },
      };

      // Mock the parseHtml function from the service module
      const { parseHtml } = await import(
        "../../../../note/actions/parse-html/service"
      );
      vi.mocked(parseHtml).mockResolvedValue(parsedData);

      const result = await action.execute(mockData, mockDeps, mockContext);

      expect(result).toBe(parsedData);
    });

    it("should handle service errors", async () => {
      const serviceError = new Error("Service error");

      // Mock the parseHtml function from the service module
      const { parseHtml } = await import(
        "../../../../note/actions/parse-html/service"
      );
      vi.mocked(parseHtml).mockRejectedValue(serviceError);

      await expect(
        action.execute(mockData, mockDeps, mockContext)
      ).rejects.toThrow("Service error");
    });

    it("should maintain retryable configuration", () => {
      expect(action.retryable).toBe(true);
    });

    it("should maintain priority configuration", () => {
      expect(action.priority).toBe(0);
    });

    it("should work with different dependency configurations", async () => {
      const minimalDeps = {
        services: {
          parseHtml: vi.fn().mockResolvedValue(mockData),
          cleanHtml: vi.fn(),
          saveNote: vi.fn(),
        },
        logger: {
          log: vi.fn(),
        },
      } as NoteWorkerDependencies;

      const result = await action.execute(mockData, minimalDeps, mockContext);

      expect(result).toBe(mockData);
    });

    it("should work with different context configurations", async () => {
      const differentContext = {
        jobId: "different-job",
        queueName: "different-queue",
        retryCount: 1,
        startTime: Date.now() - 1000,
        operation: "parse_html",
        workerName: "different-worker",
        attemptNumber: 2,
      };

      const result = await action.execute(mockData, mockDeps, differentContext);

      expect(result).toBe(mockData);
    });

    it("should handle null or undefined data gracefully", async () => {
      const nullData = null as unknown as NotePipelineData;

      // Mock the parseHtml function from the service module
      const { parseHtml } = await import(
        "../../../../note/actions/parse-html/service"
      );
      vi.mocked(parseHtml).mockResolvedValue(nullData);

      const result = await action.execute(nullData, mockDeps, mockContext);

      expect(result).toBe(nullData);
    });
  });

  describe("inheritance and type safety", () => {
    it("should extend BaseAction correctly", () => {
      expect(action).toBeInstanceOf(ParseHtmlAction);
      expect(action).toHaveProperty("execute");
      expect(action).toHaveProperty("name");
    });

    it("should implement required interface methods", () => {
      expect(typeof action.execute).toBe("function");
      expect(typeof action.name).toBe("string");
    });

    it("should have correct generic types", () => {
      const typedAction: ParseHtmlAction = action;
      expect(typedAction).toBeDefined();
    });
  });
});
