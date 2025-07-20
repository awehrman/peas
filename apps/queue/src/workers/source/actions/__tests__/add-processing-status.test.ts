import { describe, it, expect, beforeEach, vi } from "vitest";
import { AddProcessingStatusAction } from "../add-processing-status";
import { BroadcastProcessingAction } from "../../../shared/broadcast-status";

// Mock the BroadcastProcessingAction
vi.mock("../../../shared/broadcast-status", () => ({
  BroadcastProcessingAction: vi.fn().mockImplementation(() => ({
    execute: vi.fn().mockImplementation(async (data, deps, _context) => {
      await deps.addStatusEventAndBroadcast({
        importId: data.importId,
        noteId: data.noteId,
        status: "PROCESSING",
        message: data.message,
        context: "source_processing",
      });
      return data;
    }),
  })),
}));

describe("AddProcessingStatusAction", () => {
  let action: AddProcessingStatusAction;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockDeps: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockContext: any;

  beforeEach(() => {
    action = new AddProcessingStatusAction();
    mockDeps = {
      addStatusEventAndBroadcast: vi.fn().mockResolvedValue(undefined),
    };
    mockContext = {
      operation: "source_processing",
      jobId: "test-job-123",
    };
    vi.clearAllMocks();
  });

  describe("execute", () => {
    it("should add processing status when noteId and importId are provided", async () => {
      const input = {
        noteId: "test-note-123",
        importId: "test-import-456",
        sourceId: "test-source-789",
        source: { id: "test-source-789", title: "Test Source" },
      };

      const result = await action.execute(input, mockDeps, mockContext);

      expect(result).toEqual(input);
      expect(BroadcastProcessingAction).toHaveBeenCalledWith();
      expect(mockDeps.addStatusEventAndBroadcast).toHaveBeenCalledWith({
        importId: "test-import-456",
        noteId: "test-note-123",
        message: "Source processing in progress",
        status: "PROCESSING",
        context: "source_processing",
      });
    });

    it("should skip processing status when noteId is missing", async () => {
      const input = {
        importId: "test-import-456",
        sourceId: "test-source-789",
        source: { id: "test-source-789", title: "Test Source" },
      };

      const result = await action.execute(input, mockDeps, mockContext);

      expect(result).toEqual(input);
      expect(BroadcastProcessingAction).not.toHaveBeenCalled();
      expect(mockDeps.addStatusEventAndBroadcast).not.toHaveBeenCalled();
    });

    it("should skip processing status when importId is missing", async () => {
      const input = {
        noteId: "test-note-123",
        sourceId: "test-source-789",
        source: { id: "test-source-789", title: "Test Source" },
      };

      const result = await action.execute(input, mockDeps, mockContext);

      expect(result).toEqual(input);
      expect(BroadcastProcessingAction).not.toHaveBeenCalled();
      expect(mockDeps.addStatusEventAndBroadcast).not.toHaveBeenCalled();
    });

    it("should skip processing status when both noteId and importId are missing", async () => {
      const input = {
        sourceId: "test-source-789",
        source: { id: "test-source-789", title: "Test Source" },
      };

      const result = await action.execute(input, mockDeps, mockContext);

      expect(result).toEqual(input);
      expect(BroadcastProcessingAction).not.toHaveBeenCalled();
      expect(mockDeps.addStatusEventAndBroadcast).not.toHaveBeenCalled();
    });

    it("should handle empty strings for noteId and importId", async () => {
      const input = {
        noteId: "",
        importId: "",
        sourceId: "test-source-789",
      };

      const result = await action.execute(input, mockDeps, mockContext);

      expect(result).toEqual(input);
      expect(BroadcastProcessingAction).not.toHaveBeenCalled();
      expect(mockDeps.addStatusEventAndBroadcast).not.toHaveBeenCalled();
    });

    it("should handle null values for noteId and importId", async () => {
      const input = {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        noteId: null as any,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        importId: null as any,
        sourceId: "test-source-789",
      };

      const result = await action.execute(input, mockDeps, mockContext);

      expect(result).toEqual(input);
      expect(BroadcastProcessingAction).not.toHaveBeenCalled();
      expect(mockDeps.addStatusEventAndBroadcast).not.toHaveBeenCalled();
    });

    it("should handle undefined values for noteId and importId", async () => {
      const input = {
        noteId: undefined,
        importId: undefined,
        sourceId: "test-source-789",
      };

      const result = await action.execute(input, mockDeps, mockContext);

      expect(result).toEqual(input);
      expect(BroadcastProcessingAction).not.toHaveBeenCalled();
      expect(mockDeps.addStatusEventAndBroadcast).not.toHaveBeenCalled();
    });

    it("should handle complex data structure", async () => {
      const input = {
        noteId: "test-note-123",
        importId: "test-import-456",
        sourceId: "test-source-789",
        source: {
          id: "test-source-789",
          title: "Complex Test Source",
          metadata: {
            type: "article",
            author: "Test Author",
            publishedAt: "2023-01-01",
          },
          content: "This is a complex source with multiple properties",
        },
        additionalData: {
          category: "technology",
          tags: ["test", "example"],
        },
      };

      const result = await action.execute(input, mockDeps, mockContext);

      expect(result).toEqual(input);
      expect(BroadcastProcessingAction).toHaveBeenCalledWith();
      expect(mockDeps.addStatusEventAndBroadcast).toHaveBeenCalledWith({
        importId: "test-import-456",
        noteId: "test-note-123",
        message: "Source processing in progress",
        status: "PROCESSING",
        context: "source_processing",
      });
    });

    it("should handle error in BroadcastProcessingAction", async () => {
      const mockError = new Error("Broadcast error");
      const mockBroadcastAction = {
        execute: vi.fn().mockRejectedValue(mockError),
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (BroadcastProcessingAction as any).mockImplementation(
        () => mockBroadcastAction
      );

      const input = {
        noteId: "test-note-123",
        importId: "test-import-456",
        sourceId: "test-source-789",
      };

      await expect(
        action.execute(input, mockDeps, mockContext)
      ).rejects.toThrow("Broadcast error");
    });

    it("should handle error in addStatusEventAndBroadcast", async () => {
      const mockError = new Error("Status broadcast error");
      const mockBroadcastAction = {
        execute: vi.fn().mockImplementation(async (data, deps, _context) => {
          await deps.addStatusEventAndBroadcast({
            importId: data.importId,
            noteId: data.noteId,
            status: "PROCESSING",
            message: data.message,
            context: "source_processing",
          });
          throw mockError;
        }),
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (BroadcastProcessingAction as any).mockImplementation(
        () => mockBroadcastAction
      );

      const input = {
        noteId: "test-note-123",
        importId: "test-import-456",
        sourceId: "test-source-789",
      };

      await expect(
        action.execute(input, mockDeps, mockContext)
      ).rejects.toThrow("Status broadcast error");
    });
  });

  describe("action properties", () => {
    it("should have correct name", () => {
      expect(action.name).toBe("add_processing_status");
    });

    it("should be retryable by default", () => {
      expect(action.retryable).toBe(true);
    });

    it("should have default priority", () => {
      expect(action.priority).toBe(0);
    });
  });
});
