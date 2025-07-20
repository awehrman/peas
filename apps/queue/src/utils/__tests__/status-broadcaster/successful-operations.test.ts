import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { addStatusEventAndBroadcast } from "../../status-broadcaster";

// Mock dependencies
vi.mock("@peas/database", () => ({
  addStatusEvent: vi.fn(),
}));

vi.mock("../../../websocket-server", () => ({
  broadcastStatusEvent: vi.fn(),
}));

describe("addStatusEventAndBroadcast - Successful Operations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should add status event to database and broadcast when noteId is provided", async () => {
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
    const { broadcastStatusEvent } = await import("../../../websocket-server");

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
    const { broadcastStatusEvent } = await import("../../../websocket-server");

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
    const { broadcastStatusEvent } = await import("../../../websocket-server");

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
