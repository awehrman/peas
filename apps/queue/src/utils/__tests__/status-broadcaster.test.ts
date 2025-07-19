import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { addStatusEventAndBroadcast } from "../status-broadcaster";

// Mock dependencies
vi.mock("@peas/database", () => ({
  addStatusEvent: vi.fn(),
}));

vi.mock("../../websocket-server", () => ({
  broadcastStatusEvent: vi.fn(),
}));

describe("addStatusEventAndBroadcast", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("successful operations", () => {
    it("should add status event to database and broadcast when noteId is provided", async () => {
      const { addStatusEvent } = await import("@peas/database");
      const { broadcastStatusEvent } = await import("../../websocket-server");

      const mockDbEvent = {
        id: "event-123",
        noteId: "note-456",
        status: "PROCESSING" as const,
        errorMessage: null,
        errorCode: null,
        errorDetails: null,
        context: null,
        currentCount: null,
        totalCount: null,
        createdAt: new Date("2024-01-01T00:00:00Z"),
      };

      vi.mocked(addStatusEvent).mockResolvedValue(mockDbEvent);
      vi.mocked(broadcastStatusEvent).mockImplementation(() => {});

      const event = {
        importId: "import-789",
        noteId: "note-456",
        status: "PROCESSING" as const,
        message: "Processing started",
        context: "test-context",
        currentCount: 1,
        totalCount: 10,
        indentLevel: 0,
        metadata: { key: "value" },
      };

      const result = await addStatusEventAndBroadcast(event);

      expect(addStatusEvent).toHaveBeenCalledWith({
        noteId: "note-456",
        status: "PROCESSING",
        message: "Processing started",
        context: "test-context",
        currentCount: 1,
        totalCount: 10,
      });

      expect(broadcastStatusEvent).toHaveBeenCalledWith({
        importId: "import-789",
        noteId: "note-456",
        status: "PROCESSING",
        message: "Processing started",
        context: "test-context",
        errorMessage: "Processing started",
        currentCount: 1,
        totalCount: 10,
        createdAt: mockDbEvent.createdAt,
        indentLevel: 0,
        metadata: { key: "value" },
      });

      expect(result).toBe(mockDbEvent);
    });

    it("should broadcast without database event when noteId is not provided", async () => {
      const { addStatusEvent } = await import("@peas/database");
      const { broadcastStatusEvent } = await import("../../websocket-server");

      vi.mocked(broadcastStatusEvent).mockImplementation(() => {});

      const event = {
        importId: "import-789",
        status: "PROCESSING" as const,
        message: "Processing started",
        context: "test-context",
        currentCount: 1,
        totalCount: 10,
        indentLevel: 1,
        metadata: { key: "value" },
      };

      const result = await addStatusEventAndBroadcast(event);

      expect(addStatusEvent).not.toHaveBeenCalled();

      expect(broadcastStatusEvent).toHaveBeenCalledWith({
        importId: "import-789",
        noteId: undefined,
        status: "PROCESSING",
        message: "Processing started",
        context: "test-context",
        errorMessage: "Processing started",
        currentCount: 1,
        totalCount: 10,
        createdAt: expect.any(Date),
        indentLevel: 1,
        metadata: { key: "value" },
      });

      expect(result).toBeNull();
    });

    it("should handle minimal event data", async () => {
      const { addStatusEvent } = await import("@peas/database");
      const { broadcastStatusEvent } = await import("../../websocket-server");

      vi.mocked(broadcastStatusEvent).mockImplementation(() => {});

      const event = {
        importId: "import-789",
        status: "COMPLETED" as const,
      };

      const result = await addStatusEventAndBroadcast(event);

      expect(addStatusEvent).not.toHaveBeenCalled();

      expect(broadcastStatusEvent).toHaveBeenCalledWith({
        importId: "import-789",
        noteId: undefined,
        status: "COMPLETED",
        message: undefined,
        context: undefined,
        errorMessage: undefined,
        currentCount: undefined,
        totalCount: undefined,
        createdAt: expect.any(Date),
        indentLevel: undefined,
        metadata: undefined,
      });

      expect(result).toBeNull();
    });

    it("should handle event with noteId but no database event", async () => {
      const { addStatusEvent } = await import("@peas/database");
      const { broadcastStatusEvent } = await import("../../websocket-server");

      vi.mocked(addStatusEvent).mockResolvedValue({
        id: "event-123",
        noteId: "note-456",
        status: "FAILED" as const,
        errorMessage: "Something went wrong",
        errorCode: null,
        errorDetails: null,
        context: null,
        currentCount: null,
        totalCount: null,
        createdAt: new Date("2024-01-01T00:00:00Z"),
      });
      vi.mocked(broadcastStatusEvent).mockImplementation(() => {});

      const event = {
        importId: "import-789",
        noteId: "note-456",
        status: "FAILED" as const,
        message: "Something went wrong",
      };

      const result = await addStatusEventAndBroadcast(event);

      expect(addStatusEvent).toHaveBeenCalledWith({
        noteId: "note-456",
        status: "FAILED",
        message: "Something went wrong",
        context: undefined,
        currentCount: undefined,
        totalCount: undefined,
      });

      expect(broadcastStatusEvent).toHaveBeenCalledWith({
        importId: "import-789",
        noteId: "note-456",
        status: "FAILED",
        message: "Something went wrong",
        context: undefined,
        errorMessage: "Something went wrong",
        currentCount: undefined,
        totalCount: undefined,
        createdAt: expect.any(Date),
        indentLevel: undefined,
        metadata: undefined,
      });

      expect(result).toBeDefined();
      expect(result?.id).toBe("event-123");
    });
  });

  describe("error handling", () => {
    it("should throw error when database operation fails", async () => {
      const { addStatusEvent } = await import("@peas/database");
      const { broadcastStatusEvent } = await import("../../websocket-server");

      const dbError = new Error("Database connection failed");
      vi.mocked(addStatusEvent).mockRejectedValue(dbError);
      vi.mocked(broadcastStatusEvent).mockImplementation(() => {});

      const event = {
        importId: "import-789",
        noteId: "note-456",
        status: "PROCESSING" as const,
        message: "Processing started",
      };

      await expect(addStatusEventAndBroadcast(event)).rejects.toThrow(
        "Database connection failed"
      );

      expect(addStatusEvent).toHaveBeenCalled();
      expect(broadcastStatusEvent).not.toHaveBeenCalled();
    });

    it("should throw error when broadcast operation fails", async () => {
      const { addStatusEvent } = await import("@peas/database");
      const { broadcastStatusEvent } = await import("../../websocket-server");

      const broadcastError = new Error("WebSocket broadcast failed");
      vi.mocked(addStatusEvent).mockResolvedValue({
        id: "event-123",
        noteId: "note-456",
        status: "PROCESSING" as const,
        errorMessage: "Processing started",
        errorCode: null,
        errorDetails: null,
        context: null,
        currentCount: null,
        totalCount: null,
        createdAt: new Date("2024-01-01T00:00:00Z"),
      });
      vi.mocked(broadcastStatusEvent).mockImplementation(() => {
        throw broadcastError;
      });

      const event = {
        importId: "import-789",
        noteId: "note-456",
        status: "PROCESSING" as const,
        message: "Processing started",
      };

      await expect(addStatusEventAndBroadcast(event)).rejects.toThrow(
        "WebSocket broadcast failed"
      );

      expect(addStatusEvent).toHaveBeenCalled();
      expect(broadcastStatusEvent).toHaveBeenCalled();
    });

    it("should throw error when both database and broadcast operations fail", async () => {
      const { addStatusEvent } = await import("@peas/database");
      const { broadcastStatusEvent } = await import("../../websocket-server");

      const dbError = new Error("Database connection failed");
      vi.mocked(addStatusEvent).mockRejectedValue(dbError);
      vi.mocked(broadcastStatusEvent).mockImplementation(() => {});

      const event = {
        importId: "import-789",
        noteId: "note-456",
        status: "PROCESSING" as const,
        message: "Processing started",
      };

      await expect(addStatusEventAndBroadcast(event)).rejects.toThrow(
        "Database connection failed"
      );

      expect(addStatusEvent).toHaveBeenCalled();
      expect(broadcastStatusEvent).not.toHaveBeenCalled();
    });
  });

  describe("logging", () => {
    it("should log when called with full event data", async () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
      const { broadcastStatusEvent } = await import("../../websocket-server");

      vi.mocked(broadcastStatusEvent).mockImplementation(() => {});

      const event = {
        importId: "import-789",
        noteId: "note-456",
        status: "PROCESSING" as const,
        message: "Processing started",
        context: "test-context",
        currentCount: 1,
        totalCount: 10,
        indentLevel: 0,
        metadata: { key: "value" },
      };

      await addStatusEventAndBroadcast(event);

      expect(consoleSpy).toHaveBeenCalledWith(
        "[addStatusEventAndBroadcast] called with:",
        event
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        "[addStatusEventAndBroadcast] Broadcasted to websocket"
      );
    });

    it("should log database event creation when successful", async () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
      const { addStatusEvent } = await import("@peas/database");
      const { broadcastStatusEvent } = await import("../../websocket-server");

      const mockDbEvent = {
        id: "event-123",
        noteId: "note-456",
        status: "PROCESSING" as const,
        errorMessage: null,
        errorCode: null,
        errorDetails: null,
        context: null,
        currentCount: null,
        totalCount: null,
        createdAt: new Date("2024-01-01T00:00:00Z"),
      };

      vi.mocked(addStatusEvent).mockResolvedValue(mockDbEvent);
      vi.mocked(broadcastStatusEvent).mockImplementation(() => {});

      const event = {
        importId: "import-789",
        noteId: "note-456",
        status: "PROCESSING" as const,
        message: "Processing started",
      };

      await addStatusEventAndBroadcast(event);

      expect(consoleSpy).toHaveBeenCalledWith(
        "[addStatusEventAndBroadcast] DB event created:",
        mockDbEvent
      );
    });

    it("should log error when operation fails", async () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
      const consoleErrorSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      const { addStatusEvent } = await import("@peas/database");

      const dbError = new Error("Database connection failed");
      vi.mocked(addStatusEvent).mockRejectedValue(dbError);

      const event = {
        importId: "import-789",
        noteId: "note-456",
        status: "PROCESSING" as const,
        message: "Processing started",
      };

      await expect(addStatusEventAndBroadcast(event)).rejects.toThrow(
        "Database connection failed"
      );

      expect(consoleSpy).toHaveBeenCalledWith(
        "[addStatusEventAndBroadcast] called with:",
        event
      );
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "❌ Failed to add status event and broadcast:",
        dbError
      );
    });
  });

  describe("data mapping", () => {
    it("should correctly map all event fields to database call", async () => {
      const { addStatusEvent } = await import("@peas/database");
      const { broadcastStatusEvent } = await import("../../websocket-server");

      vi.mocked(addStatusEvent).mockResolvedValue({
        id: "event-123",
        noteId: "note-456",
        status: "PROCESSING" as const,
        errorMessage: "Processing started",
        errorCode: null,
        errorDetails: null,
        context: "test-context",
        currentCount: 5,
        totalCount: 20,
        createdAt: new Date("2024-01-01T00:00:00Z"),
      });
      vi.mocked(broadcastStatusEvent).mockImplementation(() => {});

      const event = {
        importId: "import-789",
        noteId: "note-456",
        status: "PROCESSING" as const,
        message: "Processing started",
        context: "test-context",
        currentCount: 5,
        totalCount: 20,
        indentLevel: 2,
        metadata: { key: "value" },
      };

      await addStatusEventAndBroadcast(event);

      expect(addStatusEvent).toHaveBeenCalledWith({
        noteId: "note-456",
        status: "PROCESSING",
        message: "Processing started",
        context: "test-context",
        currentCount: 5,
        totalCount: 20,
      });
    });

    it("should correctly map all event fields to broadcast call", async () => {
      const { addStatusEvent } = await import("@peas/database");
      const { broadcastStatusEvent } = await import("../../websocket-server");

      const mockDbEvent = {
        id: "event-123",
        noteId: "note-456",
        status: "PROCESSING" as const,
        errorMessage: null,
        errorCode: null,
        errorDetails: null,
        context: null,
        currentCount: null,
        totalCount: null,
        createdAt: new Date("2024-01-01T00:00:00Z"),
      };

      vi.mocked(addStatusEvent).mockResolvedValue(mockDbEvent);
      vi.mocked(broadcastStatusEvent).mockImplementation(() => {});

      const event = {
        importId: "import-789",
        noteId: "note-456",
        status: "PROCESSING" as const,
        message: "Processing started",
        context: "test-context",
        currentCount: 5,
        totalCount: 20,
        indentLevel: 2,
        metadata: { key: "value" },
      };

      await addStatusEventAndBroadcast(event);

      expect(broadcastStatusEvent).toHaveBeenCalledWith({
        importId: "import-789",
        noteId: "note-456",
        status: "PROCESSING",
        message: "Processing started",
        context: "test-context",
        errorMessage: "Processing started",
        currentCount: 5,
        totalCount: 20,
        createdAt: mockDbEvent.createdAt,
        indentLevel: 2,
        metadata: { key: "value" },
      });
    });

    it("should use current timestamp when no database event is created", async () => {
      const { broadcastStatusEvent } = await import("../../websocket-server");

      vi.mocked(broadcastStatusEvent).mockImplementation(() => {});

      const beforeCall = new Date();
      const event = {
        importId: "import-789",
        status: "PROCESSING" as const,
      };

      await addStatusEventAndBroadcast(event);

      const afterCall = new Date();

      const broadcastCall = vi.mocked(broadcastStatusEvent).mock.calls[0]?.[0];
      expect(broadcastCall).toBeDefined();
      const broadcastTime = broadcastCall!.createdAt;

      expect(broadcastTime).toBeInstanceOf(Date);
      expect(broadcastTime.getTime()).toBeGreaterThanOrEqual(
        beforeCall.getTime()
      );
      expect(broadcastTime.getTime()).toBeLessThanOrEqual(afterCall.getTime());
    });
  });

  describe("edge cases", () => {
    it("should handle empty string values", async () => {
      const { addStatusEvent } = await import("@peas/database");
      const { broadcastStatusEvent } = await import("../../websocket-server");

      vi.mocked(addStatusEvent).mockResolvedValue({
        id: "event-123",
        noteId: "note-456",
        status: "PROCESSING" as const,
        errorMessage: "",
        errorCode: null,
        errorDetails: null,
        context: "",
        currentCount: null,
        totalCount: null,
        createdAt: new Date("2024-01-01T00:00:00Z"),
      });
      vi.mocked(broadcastStatusEvent).mockImplementation(() => {});

      const event = {
        importId: "import-789",
        noteId: "note-456",
        status: "PROCESSING" as const,
        message: "",
        context: "",
      };

      await addStatusEventAndBroadcast(event);

      expect(addStatusEvent).toHaveBeenCalledWith({
        noteId: "note-456",
        status: "PROCESSING",
        message: "",
        context: "",
        currentCount: undefined,
        totalCount: undefined,
      });

      expect(broadcastStatusEvent).toHaveBeenCalledWith({
        importId: "import-789",
        noteId: "note-456",
        status: "PROCESSING",
        message: "",
        context: "",
        errorMessage: "",
        currentCount: undefined,
        totalCount: undefined,
        createdAt: expect.any(Date),
        indentLevel: undefined,
        metadata: undefined,
      });
    });

    it("should handle zero values for counts", async () => {
      const { addStatusEvent } = await import("@peas/database");
      const { broadcastStatusEvent } = await import("../../websocket-server");

      vi.mocked(addStatusEvent).mockResolvedValue({
        id: "event-123",
        noteId: "note-456",
        status: "PROCESSING" as const,
        errorMessage: null,
        errorCode: null,
        errorDetails: null,
        context: null,
        currentCount: 0,
        totalCount: 0,
        createdAt: new Date("2024-01-01T00:00:00Z"),
      });
      vi.mocked(broadcastStatusEvent).mockImplementation(() => {});

      const event = {
        importId: "import-789",
        noteId: "note-456",
        status: "PROCESSING" as const,
        currentCount: 0,
        totalCount: 0,
        indentLevel: 0,
      };

      await addStatusEventAndBroadcast(event);

      expect(addStatusEvent).toHaveBeenCalledWith({
        noteId: "note-456",
        status: "PROCESSING",
        message: undefined,
        context: undefined,
        currentCount: 0,
        totalCount: 0,
      });

      expect(broadcastStatusEvent).toHaveBeenCalledWith({
        importId: "import-789",
        noteId: "note-456",
        status: "PROCESSING",
        message: undefined,
        context: undefined,
        errorMessage: undefined,
        currentCount: 0,
        totalCount: 0,
        createdAt: expect.any(Date),
        indentLevel: 0,
        metadata: undefined,
      });
    });

    it("should handle large numbers for counts", async () => {
      const { addStatusEvent } = await import("@peas/database");
      const { broadcastStatusEvent } = await import("../../websocket-server");

      vi.mocked(addStatusEvent).mockResolvedValue({
        id: "event-123",
        noteId: "note-456",
        status: "PROCESSING" as const,
        errorMessage: null,
        errorCode: null,
        errorDetails: null,
        context: null,
        currentCount: 999999,
        totalCount: 1000000,
        createdAt: new Date("2024-01-01T00:00:00Z"),
      });
      vi.mocked(broadcastStatusEvent).mockImplementation(() => {});

      const event = {
        importId: "import-789",
        noteId: "note-456",
        status: "PROCESSING" as const,
        currentCount: 999999,
        totalCount: 1000000,
      };

      await addStatusEventAndBroadcast(event);

      expect(addStatusEvent).toHaveBeenCalledWith({
        noteId: "note-456",
        status: "PROCESSING",
        message: undefined,
        context: undefined,
        currentCount: 999999,
        totalCount: 1000000,
      });
    });
  });
});
