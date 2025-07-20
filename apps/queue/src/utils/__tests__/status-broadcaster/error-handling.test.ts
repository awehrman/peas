import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { addStatusEventAndBroadcast } from "../../status-broadcaster";

// Mock dependencies
vi.mock("@peas/database", () => ({
  addStatusEvent: vi.fn(),
}));

vi.mock("../../../websocket-server", () => ({
  broadcastStatusEvent: vi.fn(),
}));

describe("addStatusEventAndBroadcast - Error Handling", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should throw error when database operation fails", async () => {
    const { addStatusEvent } = await import("@peas/database");
    const { broadcastStatusEvent } = await import("../../../websocket-server");

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
    const { broadcastStatusEvent } = await import("../../../websocket-server");

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
    const { broadcastStatusEvent } = await import("../../../websocket-server");

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
