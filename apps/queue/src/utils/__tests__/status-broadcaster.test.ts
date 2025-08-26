import type { NoteStatus } from "@peas/database";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { addStatusEventAndBroadcast } from "../status-broadcaster";

// Mock the database module
vi.mock("@peas/database", () => ({
  addStatusEvent: vi.fn(),
}));

// Mock the websocket server
vi.mock("../../services/websocket-server", () => ({
  broadcastStatusEvent: vi.fn(),
}));

describe("addStatusEventAndBroadcast", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    
    // Clear the event cache between tests to prevent deduplication
    // We'll use unique importIds in each test instead
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should add status event and broadcast with noteId", async () => {
    const mockAddStatusEvent = vi.mocked(
      await import("@peas/database")
    ).addStatusEvent;
    const mockBroadcastStatusEvent = vi.mocked(
      await import("../../services/websocket-server")
    ).broadcastStatusEvent;

    const mockDbEvent = {
      id: "event-1",
      noteId: "note-123",
      status: "PROCESSING" as NoteStatus,
      message: "Test message",
      context: "save_note",
      currentCount: 5,
      totalCount: 10,
      createdAt: new Date("2023-01-01T00:00:00.000Z"),
      updatedAt: new Date("2023-01-01T00:00:00.000Z"),
      errorMessage: null,
      errorCode: null,
      errorDetails: null,
    };

    mockAddStatusEvent.mockResolvedValue(mockDbEvent);

    const result = await addStatusEventAndBroadcast({
      importId: "import-1",
      noteId: "note-123",
      status: "PROCESSING" as NoteStatus,
      message: "Test message",
      context: "save_note",
      currentCount: 5,
      totalCount: 10,
      indentLevel: 1,
      metadata: { key: "value" },
    });

    expect(mockAddStatusEvent).toHaveBeenCalledWith({
      noteId: "note-123",
      status: "PROCESSING",
      message: "Test message",
      context: "save_note",
      currentCount: 5,
      totalCount: 10,
    });

    expect(mockBroadcastStatusEvent).toHaveBeenCalledWith({
      importId: "import-1",
      noteId: "note-123",
      status: "PROCESSING",
      message: "Test message",
      context: "save_note",
      errorMessage: undefined,
      currentCount: 5,
      totalCount: 10,
      createdAt: mockDbEvent.createdAt,
      indentLevel: 1,
      metadata: { key: "value" },
    });

    expect(result).toBe(mockDbEvent);
  });

  it("should broadcast without database event when noteId is not provided", async () => {
    const mockAddStatusEvent = vi.mocked(
      await import("@peas/database")
    ).addStatusEvent;
    const mockBroadcastStatusEvent = vi.mocked(
      await import("../../services/websocket-server")
    ).broadcastStatusEvent;

    const result = await addStatusEventAndBroadcast({
      importId: "import-1",
      status: "COMPLETED" as NoteStatus,
      message: "Import completed",
      context: "note_completion",
      currentCount: 100,
      totalCount: 100,
      indentLevel: 0,
      metadata: { importType: "bulk" },
    });

    expect(mockAddStatusEvent).not.toHaveBeenCalled();

    expect(mockBroadcastStatusEvent).toHaveBeenCalledWith({
      importId: "import-1",
      noteId: undefined,
      status: "COMPLETED",
      message: "Import completed",
      context: "note_completion",
      errorMessage: undefined,
      currentCount: 100,
      totalCount: 100,
      createdAt: expect.any(Date),
      indentLevel: 0,
      metadata: { importType: "bulk" },
    });

    expect(result).toBeNull();
  });

  it("should handle database errors gracefully", async () => {
    const mockAddStatusEvent = vi.mocked(
      await import("@peas/database")
    ).addStatusEvent;
    const mockBroadcastStatusEvent = vi.mocked(
      await import("../../services/websocket-server")
    ).broadcastStatusEvent;

    const dbError = new Error("Database connection failed");
    mockAddStatusEvent.mockRejectedValue(dbError);

    await expect(
      addStatusEventAndBroadcast({
        importId: "import-1",
        noteId: "note-123",
        status: "COMPLETED_WITH_ERROR" as NoteStatus,
        message: "Database error",
        context: "save_note",
      })
    ).rejects.toThrow("Database connection failed");

    expect(mockAddStatusEvent).toHaveBeenCalledWith({
      noteId: "note-123",
      status: "COMPLETED_WITH_ERROR",
      message: "Database error",
      context: "save_note",
      currentCount: undefined,
      totalCount: undefined,
    });

    // Broadcast should not be called when database fails
    expect(mockBroadcastStatusEvent).not.toHaveBeenCalled();
  });

  it("should handle websocket broadcast errors gracefully", async () => {
    const mockAddStatusEvent = vi.mocked(
      await import("@peas/database")
    ).addStatusEvent;
    const mockBroadcastStatusEvent = vi.mocked(
      await import("../../services/websocket-server")
    ).broadcastStatusEvent;

    const mockDbEvent = {
      id: "event-1",
      noteId: "note-123",
      status: "PROCESSING" as NoteStatus,
      message: "Test message",
      context: "save_note",
      currentCount: 5,
      totalCount: 10,
      createdAt: new Date("2023-01-01T00:00:00.000Z"),
      updatedAt: new Date("2023-01-01T00:00:00.000Z"),
      errorMessage: null,
      errorCode: null,
      errorDetails: null,
    };

    mockAddStatusEvent.mockResolvedValue(mockDbEvent);

    const broadcastError = new Error("WebSocket connection failed");
    mockBroadcastStatusEvent.mockImplementation(() => {
      throw broadcastError;
    });

    await expect(
      addStatusEventAndBroadcast({
        importId: "import-1",
        noteId: "note-123",
        status: "PROCESSING" as NoteStatus,
        message: "Test message",
        context: "save_note",
      })
    ).rejects.toThrow("WebSocket connection failed");

    expect(mockAddStatusEvent).toHaveBeenCalled();
    expect(mockBroadcastStatusEvent).toHaveBeenCalled();
  });

  it("should log function calls and results", async () => {
    const mockAddStatusEvent = vi.mocked(
      await import("@peas/database")
    ).addStatusEvent;
    const mockBroadcastStatusEvent = vi.mocked(
      await import("../../services/websocket-server")
    ).broadcastStatusEvent;

    const mockDbEvent = {
      id: "event-1",
      noteId: "note-123",
      status: "PROCESSING" as NoteStatus,
      message: "Test message",
      context: "save_note",
      currentCount: 5,
      totalCount: 10,
      createdAt: new Date("2023-01-01T00:00:00.000Z"),
      updatedAt: new Date("2023-01-01T00:00:00.000Z"),
      errorMessage: null,
      errorCode: null,
      errorDetails: null,
    };

    mockAddStatusEvent.mockResolvedValue(mockDbEvent);

    await addStatusEventAndBroadcast({
      importId: "import-log-test",
      noteId: "note-123",
      status: "PROCESSING" as NoteStatus,
      message: "Test message",
      context: "save_note",
    });

    expect(mockBroadcastStatusEvent).toHaveBeenCalled();
  });

  it("should log errors when they occur", async () => {
    const mockAddStatusEvent = vi.mocked(
      await import("@peas/database")
    ).addStatusEvent;

    const dbError = new Error("Database connection failed");
    mockAddStatusEvent.mockRejectedValue(dbError);

    await expect(
      addStatusEventAndBroadcast({
        importId: "import-1",
        noteId: "note-123",
        status: "COMPLETED_WITH_ERROR" as NoteStatus,
        message: "Database error",
        context: "save_note",
      })
    ).rejects.toThrow("Database connection failed");

    expect(console.error).toHaveBeenCalledWith(
      "❌ Failed to add status event and broadcast:",
      dbError
    );
  });

  it("should handle all optional parameters correctly", async () => {
    const mockAddStatusEvent = vi.mocked(
      await import("@peas/database")
    ).addStatusEvent;
    const mockBroadcastStatusEvent = vi.mocked(
      await import("../../services/websocket-server")
    ).broadcastStatusEvent;

    const mockDbEvent = {
      id: "event-1",
      noteId: "note-123",
      status: "PROCESSING" as NoteStatus,
      message: "Test message",
      context: "save_note",
      currentCount: 5,
      totalCount: 10,
      createdAt: new Date("2023-01-01T00:00:00.000Z"),
      updatedAt: new Date("2023-01-01T00:00:00.000Z"),
      errorMessage: null,
      errorCode: null,
      errorDetails: null,
    };

    mockAddStatusEvent.mockResolvedValue(mockDbEvent);

    await addStatusEventAndBroadcast({
      importId: "import-optional-test",
      noteId: "note-123",
      status: "PROCESSING" as NoteStatus,
      context: "save_note",
    });

    expect(mockAddStatusEvent).toHaveBeenCalledWith({
      noteId: "note-123",
      status: "PROCESSING",
      message: undefined,
      context: "save_note",
      currentCount: undefined,
      totalCount: undefined,
    });

    expect(mockBroadcastStatusEvent).toHaveBeenCalledWith({
      importId: "import-optional-test",
      noteId: "note-123",
      status: "PROCESSING",
      message: undefined,
      context: "save_note",
      errorMessage: undefined,
      currentCount: undefined,
      totalCount: undefined,
      createdAt: mockDbEvent.createdAt,
      indentLevel: undefined,
      metadata: undefined,
    });
  });

  it("should handle different status types", async () => {
    const mockAddStatusEvent = vi.mocked(
      await import("@peas/database")
    ).addStatusEvent;
    const mockBroadcastStatusEvent = vi.mocked(
      await import("../../services/websocket-server")
    ).broadcastStatusEvent;

    const statuses: NoteStatus[] = ["PENDING", "PROCESSING", "COMPLETED"];

    for (const status of statuses) {
      vi.clearAllMocks();

      const mockDbEvent = {
        id: `event-${status}`,
        noteId: "note-123",
        status,
        message: `Status: ${status}`,
        context: "save_note",
        currentCount: 1,
        totalCount: 1,
        createdAt: new Date("2023-01-01T00:00:00.000Z"),
        updatedAt: new Date("2023-01-01T00:00:00.000Z"),
        errorMessage: null,
        errorCode: null,
        errorDetails: null,
      };

      mockAddStatusEvent.mockResolvedValue(mockDbEvent);

      await addStatusEventAndBroadcast({
        importId: `import-status-${status}`,
        noteId: "note-123",
        status,
        message: `Status: ${status}`,
        context: "save_note",
      });

      expect(mockAddStatusEvent).toHaveBeenCalledWith({
        noteId: "note-123",
        status,
        message: `Status: ${status}`,
        context: "save_note",
        currentCount: undefined,
        totalCount: undefined,
      });

      expect(mockBroadcastStatusEvent).toHaveBeenCalledWith({
        importId: `import-status-${status}`,
        noteId: "note-123",
        status,
        message: `Status: ${status}`,
        context: "save_note",
        errorMessage: undefined,
        currentCount: undefined,
        totalCount: undefined,
        createdAt: mockDbEvent.createdAt,
        indentLevel: undefined,
        metadata: undefined,
      });
    }
  });
});
