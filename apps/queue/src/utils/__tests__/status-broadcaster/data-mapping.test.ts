import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { addStatusEventAndBroadcast } from "../../status-broadcaster";

// Mock dependencies
vi.mock("@peas/database", () => ({
  addStatusEvent: vi.fn(),
}));

vi.mock("../../../websocket-server", () => ({
  broadcastStatusEvent: vi.fn(),
}));

describe("addStatusEventAndBroadcast - Data Mapping", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should correctly map all event fields to database call", async () => {
    const { addStatusEvent } = await import("@peas/database");
    const { broadcastStatusEvent } = await import("../../../websocket-server");

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
    const { broadcastStatusEvent } = await import("../../../websocket-server");

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
