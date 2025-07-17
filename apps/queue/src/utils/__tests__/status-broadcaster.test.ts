import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock modules before importing the function under test
vi.doMock("@peas/database", () => ({
  addStatusEvent: vi.fn(),
}));

let addStatusEventAndBroadcast: typeof import("../status-broadcaster").addStatusEventAndBroadcast;
let addStatusEvent: any;

describe("addStatusEventAndBroadcast", () => {
  const baseArgs = {
    noteId: "note-1",
    status: "PROCESSING" as any, // Use 'any' for NoteStatus for test
    message: "Test message",
    context: "test-context",
    currentCount: 2,
    totalCount: 5,
  };

  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    vi.resetModules();
    // Re-import after resetting modules to ensure mocks are used
    const db = await import("@peas/database");
    addStatusEvent = db.addStatusEvent;
    ({ addStatusEventAndBroadcast } = await import("../status-broadcaster"));
    vi.clearAllMocks();
    consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  it("calls addStatusEvent with correct args and returns dbEvent", async () => {
    const fakeDbEvent = { createdAt: new Date(), ...baseArgs };
    addStatusEvent.mockResolvedValue(fakeDbEvent);

    const result = await addStatusEventAndBroadcast(baseArgs);

    expect(addStatusEvent).toHaveBeenCalledWith(baseArgs);
    expect(result).toBe(fakeDbEvent);
    expect(consoleLogSpy).toHaveBeenCalledWith(
      "[addStatusEventAndBroadcast] called with:",
      expect.objectContaining({
        noteId: "note-1",
        status: "PROCESSING",
        message: "Test message",
        context: "test-context",
      })
    );
  });

  it("rethrows and logs error from addStatusEvent", async () => {
    const error = new Error("DB fail");
    addStatusEvent.mockRejectedValue(error);

    await expect(addStatusEventAndBroadcast(baseArgs)).rejects.toThrow(
      "DB fail"
    );
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining("Failed to add status event and broadcast:"),
      error
    );
  });

  it("works with minimal args (only required)", async () => {
    const minimalArgs = { noteId: "n2", status: "COMPLETE" as any };
    const fakeDbEvent = { createdAt: new Date(), ...minimalArgs };
    addStatusEvent.mockResolvedValue(fakeDbEvent);

    const result = await addStatusEventAndBroadcast(minimalArgs);
    expect(addStatusEvent).toHaveBeenCalledWith(minimalArgs);
    expect(result).toBe(fakeDbEvent);
  });

  // Note: WebSocket broadcast tests are skipped due to mocking issues
  // The function does call broadcastStatusEvent, but we can't easily mock it
  // in this test environment due to ESM/CJS interop issues
});
