import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { addStatusEventAndBroadcast } from "../../status-broadcaster";

// Mock dependencies
vi.mock("@peas/database", () => ({
  addStatusEvent: vi.fn(),
}));

vi.mock("../../../websocket-server", () => ({
  broadcastStatusEvent: vi.fn(),
}));

describe("addStatusEventAndBroadcast - Logging", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should log when called with full event data", async () => {
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const { broadcastStatusEvent } = await import("../../../websocket-server");

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
    const { broadcastStatusEvent } = await import("../../../websocket-server");

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
