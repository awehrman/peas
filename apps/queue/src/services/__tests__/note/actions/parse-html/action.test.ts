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
  parseHtmlFile: vi.fn(),
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
    (mockDeps.services.parseHtml as any).mockResolvedValue(mockData);
  });

  describe("name", () => {
    it("should have the correct action name", () => {
      expect(action.name).toBe(ActionName.PARSE_HTML);
    });
  });

  describe("validateInput", () => {
    it("should return null for valid data", () => {
      mockParseHtmlDataSchema.mockReturnValue(mockData);

      const result = action.validateInput(mockData);

      expect(result).toBeNull();
      expect(mockParseHtmlDataSchema).toHaveBeenCalledWith(mockData);
    });

    it("should return error for invalid data", () => {
      const validationError = new Error("Validation failed");
      mockParseHtmlDataSchema.mockImplementation(() => {
        throw validationError;
      });

      const result = action.validateInput(mockData);

      expect(result).toBe(validationError);
      expect(mockParseHtmlDataSchema).toHaveBeenCalledWith(mockData);
    });

    it("should return error for non-Error exceptions", () => {
      mockParseHtmlDataSchema.mockImplementation(() => {
        throw "String error";
      });

      const result = action.validateInput(mockData);

      expect(result).toBeInstanceOf(Error);
      expect(result?.message).toBe("String error");
    });

    it("should handle empty content", () => {
      const dataWithEmptyContent = {
        ...mockData,
        content: "",
      };
      mockParseHtmlDataSchema.mockImplementation(() => {
        throw new Error("Content cannot be empty");
      });

      const result = action.validateInput(dataWithEmptyContent);

      expect(result).toBeInstanceOf(Error);
      expect(result?.message).toBe("Content cannot be empty");
    });

    it("should handle missing content property", () => {
      const dataWithoutContent = {
        jobId: "test-job-123",
        noteId: "test-note-456",
        importId: "test-import-789",
        metadata: { source: "test" },
      } as unknown as NotePipelineData;
      mockParseHtmlDataSchema.mockImplementation(() => {
        throw new Error("Content is required");
      });

      const result = action.validateInput(dataWithoutContent);

      expect(result).toBeInstanceOf(Error);
      expect(result?.message).toBe("Content is required");
    });
  });

  describe("execute", () => {
    it("should execute the service action with correct parameters", async () => {
      const result = await action.execute(mockData, mockDeps, mockContext);

      expect(mockDeps.services.parseHtml).toHaveBeenCalledWith(mockData);
      expect(result).toBe(mockData);
    });

    it("should call executeServiceAction with correct options", async () => {
      // Spy on executeServiceAction
      const executeServiceActionSpy = vi.spyOn(
        action,
        "executeServiceAction" as any
      );

      await action.execute(mockData, mockDeps, mockContext);

      expect(executeServiceActionSpy).toHaveBeenCalledWith({
        data: mockData,
        deps: mockDeps,
        context: mockContext,
        serviceCall: expect.any(Function),
        contextName: "parse_html_start",
        startMessage: "Parsing HTML",
        completionMessage: "Finished parsing HTML file.",
        additionalBroadcasting: expect.any(Function),
      });
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

      (mockDeps.services.parseHtml as any).mockResolvedValue(parsedData);

      const result = await action.execute(mockData, mockDeps, mockContext);

      expect(result).toBe(parsedData);
    });

    it("should execute additional broadcasting when importId and statusBroadcaster are present", async () => {
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

      (mockDeps.services.parseHtml as any).mockResolvedValue(parsedData);

      // Spy on executeServiceAction before calling execute
      const executeServiceActionSpy = vi.spyOn(
        action,
        "executeServiceAction" as any
      );

      await action.execute(mockData, mockDeps, mockContext);

      // Get the additionalBroadcasting function
      const callArgs = executeServiceActionSpy.mock.calls[0]?.[0];
      const additionalBroadcasting = (callArgs as any)?.additionalBroadcasting;

      // Execute the broadcasting function
      await additionalBroadcasting(parsedData);

      expect(
        mockDeps.statusBroadcaster?.addStatusEventAndBroadcast
      ).toHaveBeenCalledTimes(7); // 1 start + 3 additional broadcasting calls + 3 from service execution

      // Check completion message
      expect(
        mockDeps.statusBroadcaster?.addStatusEventAndBroadcast
      ).toHaveBeenCalledWith({
        importId: mockData.importId,
        status: "COMPLETED",
        message: "Finished parsing HTML file.",
        context: "parse_html_complete",
        indentLevel: 1,
        metadata: {
          noteTitle: parsedData.file.title,
        },
      });

      // Check ingredient count status
      expect(
        mockDeps.statusBroadcaster?.addStatusEventAndBroadcast
      ).toHaveBeenCalledWith({
        importId: mockData.importId,
        status: "PENDING",
        message: "0/2 ingredients",
        context: "parse_html_ingredients",
        indentLevel: 2,
        metadata: {
          totalIngredients: 2,
          processedIngredients: 0,
        },
      });

      // Check instruction count status
      expect(
        mockDeps.statusBroadcaster?.addStatusEventAndBroadcast
      ).toHaveBeenCalledWith({
        importId: mockData.importId,
        status: "PENDING",
        message: "0/2 instructions",
        context: "parse_html_instructions",
        indentLevel: 2,
        metadata: {
          totalInstructions: 2,
          processedInstructions: 0,
        },
      });
    });

    it("should not execute additional broadcasting when importId is missing", async () => {
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

      (mockDeps.services.parseHtml as any).mockResolvedValue(parsedData);

      // Spy on executeServiceAction before calling execute
      const executeServiceActionSpy = vi.spyOn(
        action,
        "executeServiceAction" as any
      );

      await action.execute(dataWithoutImportId, mockDeps, mockContext);

      // Get the additionalBroadcasting function
      const callArgs = executeServiceActionSpy.mock.calls[0]?.[0];
      const additionalBroadcasting = (callArgs as any)?.additionalBroadcasting;

      // Execute the broadcasting function
      await additionalBroadcasting(parsedData);

      expect(
        mockDeps.statusBroadcaster?.addStatusEventAndBroadcast
      ).not.toHaveBeenCalled();
    });

    it("should not execute additional broadcasting when statusBroadcaster is missing", async () => {
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

      (depsWithoutBroadcaster.services.parseHtml as any).mockResolvedValue(
        parsedData
      );

      // Spy on executeServiceAction before calling execute
      const executeServiceActionSpy = vi.spyOn(
        action,
        "executeServiceAction" as any
      );

      await action.execute(mockData, depsWithoutBroadcaster, mockContext);

      // Get the additionalBroadcasting function
      const callArgs = executeServiceActionSpy.mock.calls[0]?.[0];
      const additionalBroadcasting = (callArgs as any)?.additionalBroadcasting;

      // Execute the broadcasting function
      await additionalBroadcasting(parsedData);

      expect(
        mockDeps.statusBroadcaster?.addStatusEventAndBroadcast
      ).not.toHaveBeenCalled();
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

      (mockDeps.services.parseHtml as any).mockResolvedValue(parsedData);

      // Spy on executeServiceAction before calling execute
      const executeServiceActionSpy = vi.spyOn(
        action,
        "executeServiceAction" as any
      );

      await action.execute(mockData, mockDeps, mockContext);

      // Get the additionalBroadcasting function
      const callArgs = executeServiceActionSpy.mock.calls[0]?.[0];
      const additionalBroadcasting = (callArgs as any)?.additionalBroadcasting;

      // Execute the broadcasting function
      await additionalBroadcasting(parsedData);

      expect(
        mockDeps.statusBroadcaster?.addStatusEventAndBroadcast
      ).toHaveBeenCalledWith({
        importId: mockData.importId,
        status: "PENDING",
        message: "0/0 ingredients",
        context: "parse_html_ingredients",
        indentLevel: 2,
        metadata: {
          totalIngredients: 0,
          processedIngredients: 0,
        },
      });

      expect(
        mockDeps.statusBroadcaster?.addStatusEventAndBroadcast
      ).toHaveBeenCalledWith({
        importId: mockData.importId,
        status: "PENDING",
        message: "0/0 instructions",
        context: "parse_html_instructions",
        indentLevel: 2,
        metadata: {
          totalInstructions: 0,
          processedInstructions: 0,
        },
      });
    });

    it("should handle undefined ingredients and instructions", async () => {
      const parsedData = {
        ...mockData,
        file: {
          title: "Test Recipe",
          contents: mockData.content,
          ingredients: undefined,
          instructions: undefined,
        },
      };

      (mockDeps.services.parseHtml as any).mockResolvedValue(parsedData);

      // Spy on executeServiceAction before calling execute
      const executeServiceActionSpy = vi.spyOn(
        action,
        "executeServiceAction" as any
      );

      await action.execute(mockData, mockDeps, mockContext);

      // Get the additionalBroadcasting function
      const callArgs = executeServiceActionSpy.mock.calls[0]?.[0];
      const additionalBroadcasting = (callArgs as any)?.additionalBroadcasting;

      // Execute the broadcasting function
      await additionalBroadcasting(parsedData);

      expect(
        mockDeps.statusBroadcaster?.addStatusEventAndBroadcast
      ).toHaveBeenCalledWith({
        importId: mockData.importId,
        status: "PENDING",
        message: "0/0 ingredients",
        context: "parse_html_ingredients",
        indentLevel: 2,
        metadata: {
          totalIngredients: 0,
          processedIngredients: 0,
        },
      });

      expect(
        mockDeps.statusBroadcaster?.addStatusEventAndBroadcast
      ).toHaveBeenCalledWith({
        importId: mockData.importId,
        status: "PENDING",
        message: "0/0 instructions",
        context: "parse_html_instructions",
        indentLevel: 2,
        metadata: {
          totalInstructions: 0,
          processedInstructions: 0,
        },
      });
    });

    it("should handle service errors", async () => {
      const serviceError = new Error("Service error");

      (mockDeps.services.parseHtml as any).mockRejectedValue(serviceError);

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

      (mockDeps.services.parseHtml as any).mockResolvedValue(nullData);

      const result = await action.execute(nullData, mockDeps, mockContext);

      expect(result).toBe(nullData);
    });
  });

  describe("inheritance and type safety", () => {
    it("should extend BaseAction correctly", () => {
      expect(action).toBeInstanceOf(ParseHtmlAction);
      expect(action).toHaveProperty("execute");
      expect(action).toHaveProperty("name");
      expect(action).toHaveProperty("validateInput");
    });

    it("should implement required interface methods", () => {
      expect(typeof action.execute).toBe("function");
      expect(typeof action.name).toBe("string");
      expect(typeof action.validateInput).toBe("function");
    });

    it("should have correct generic types", () => {
      const typedAction: ParseHtmlAction = action;
      expect(typedAction).toBeDefined();
    });
  });
});
