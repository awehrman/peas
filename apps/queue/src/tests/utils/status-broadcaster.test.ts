import { describe, it, expect, vi, beforeEach } from "vitest";
import { addStatusEventAndBroadcast } from "../../utils/status-broadcaster";
import type { NoteStatus } from "@peas/database";

// Mock dependencies
vi.mock("@peas/database", () => ({
  addStatusEvent: vi.fn(),
}));
vi.mock("../../websocket-server", () => ({
  broadcastStatusEvent: vi.fn(),
}));

import { addStatusEvent } from "@peas/database";
import { broadcastStatusEvent } from "../../websocket-server";

describe("addStatusEventAndBroadcast", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should add status event and broadcast it (happy path)", async () => {
    const fakeEvent = {
      createdAt: new Date(),
      noteId: "n1",
      status: "PENDING" as NoteStatus,
    };
    (addStatusEvent as any).mockResolvedValue(fakeEvent);
    const input = {
      noteId: "n1",
      status: "PENDING" as NoteStatus,
      message: "msg",
      context: "ctx",
      currentCount: 1,
      totalCount: 2,
    };
    const result = await addStatusEventAndBroadcast(input);
    expect(addStatusEvent).toHaveBeenCalledWith(input);
    expect(broadcastStatusEvent).toHaveBeenCalledWith({
      ...input,
      errorMessage: input.message,
      createdAt: fakeEvent.createdAt,
    });
    expect(result).toBe(fakeEvent);
  });

  it("should log and rethrow if addStatusEvent throws (error path)", async () => {
    const error = new Error("fail");
    (addStatusEvent as any).mockRejectedValue(error);
    const input = { noteId: "n2", status: "FAILED" as NoteStatus };
    const logSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(addStatusEventAndBroadcast(input)).rejects.toThrow("fail");
    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining("Failed to add status event and broadcast"),
      error
    );
    logSpy.mockRestore();
  });
});
