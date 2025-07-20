import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { addStatusEventAndBroadcast } from "../../status-broadcaster";

// Mock dependencies
vi.mock("@peas/database", () => ({
  addStatusEvent: vi.fn(),
}));

vi.mock("../../../websocket-server", () => ({
  broadcastStatusEvent: vi.fn(),
}));

describe("addStatusEventAndBroadcast - Edge Cases", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should handle empty string values", async () => {
    const { addStatusEvent } = await import("@peas/database");
    const { broadcastStatusEvent } = await import("../../../websocket-server");

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
    const { broadcastStatusEvent } = await import("../../../websocket-server");

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
    const { broadcastStatusEvent } = await import("../../../websocket-server");

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
