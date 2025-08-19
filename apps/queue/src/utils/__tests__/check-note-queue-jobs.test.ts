import type { QueueJob } from "@prisma/client";
import { $Enums } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@peas/database", () => ({
  getQueueJobByNoteId: vi.fn(),
}));

describe("check-note-queue-jobs util", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("prints grouped jobs with emoji and details", async () => {
    const { getQueueJobByNoteId } = await import("@peas/database");
    const now = new Date();
    const jobs: Array<Partial<QueueJob>> = [
      {
        jobId: "j1",
        type: $Enums.QueueJobType.PROCESS_CATEGORIZATION,
        status: $Enums.QueueJobStatus.PENDING,
        createdAt: now,
      },
      {
        jobId: "j2",
        type: $Enums.QueueJobType.PROCESS_CATEGORIZATION,
        status: $Enums.QueueJobStatus.COMPLETED,
        createdAt: now,
        startedAt: now,
        completedAt: now,
        errorMessage: "cat failed",
      },
      {
        jobId: "j3",
        type: $Enums.QueueJobType.PROCESS_NOTE,
        status: $Enums.QueueJobStatus.FAILED,
        createdAt: now,
        errorMessage: "boom",
      },
    ];
    vi.mocked(getQueueJobByNoteId).mockResolvedValue(
      jobs as unknown as QueueJob[]
    );

    const consoleLog = vi.spyOn(console, "log").mockImplementation(() => {});
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    const { checkNoteQueueJobs } = await import("../check-note-queue-jobs");

    await checkNoteQueueJobs("note-1");

    expect(getQueueJobByNoteId).toHaveBeenCalledWith("note-1");
    // Group headers
    expect(
      consoleLog.mock.calls.some((c) =>
        String(c[0]).includes("📋 Total jobs for note: 3")
      )
    ).toBe(true);
    expect(
      consoleLog.mock.calls.some((c) =>
        String(c[0]).includes("✅ COMPLETED jobs")
      )
    ).toBe(true);
    expect(
      consoleLog.mock.calls.some((c) => String(c[0]).includes("❌ FAILED jobs"))
    ).toBe(true);
    // Categorization section
    expect(
      consoleLog.mock.calls.some((c) =>
        String(c[0]).includes("Categorization jobs for this note: 2")
      )
    ).toBe(true);

    expect(consoleError).not.toHaveBeenCalled();

    consoleLog.mockRestore();
    consoleError.mockRestore();
  });

  it("handles no jobs", async () => {
    const { getQueueJobByNoteId } = await import("@peas/database");
    vi.mocked(getQueueJobByNoteId).mockResolvedValue(
      [] as unknown as QueueJob[]
    );
    const consoleLog = vi.spyOn(console, "log").mockImplementation(() => {});
    const { checkNoteQueueJobs } = await import("../check-note-queue-jobs");
    await checkNoteQueueJobs("note-2");
    expect(
      consoleLog.mock.calls.some((c) =>
        String(c[0]).includes("No QueueJob entries found")
      )
    ).toBe(true);
    consoleLog.mockRestore();
  });

  it("logs error when database throws", async () => {
    const { getQueueJobByNoteId } = await import("@peas/database");
    vi.mocked(getQueueJobByNoteId).mockRejectedValue(new Error("db err"));
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const { checkNoteQueueJobs } = await import("../check-note-queue-jobs");
    await expect(checkNoteQueueJobs("note-3")).rejects.toThrow("db err");
    expect(consoleError).toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it("getStatusEmoji default/CANCELLED branches and CLI usage error", async () => {
    const mod = await import("../check-note-queue-jobs");
    const emojiCancelled = mod.getStatusEmoji("CANCELLED");
    const emojiUnknown = mod.getStatusEmoji("SOMETHING");
    expect(emojiCancelled).toBe("🚫");
    expect(emojiUnknown).toBe("❓");

    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(mod.runCli([])).rejects.toThrow("Note ID is required");
    expect(errSpy.mock.calls.some((c) => String(c[0]).includes("Usage:"))).toBe(
      true
    );
    errSpy.mockRestore();
  });

  it("covers all getStatusEmoji statuses", async () => {
    const { getStatusEmoji } = await import("../check-note-queue-jobs");
    expect(getStatusEmoji("PENDING")).toBe("📋");
    expect(getStatusEmoji("PROCESSING")).toBe("⚙️");
    expect(getStatusEmoji("COMPLETED")).toBe("✅");
    expect(getStatusEmoji("FAILED")).toBe("❌");
  });

  it("runCli happy path prints without throwing", async () => {
    const { getQueueJobByNoteId } = await import("@peas/database");
    vi.mocked(getQueueJobByNoteId).mockResolvedValue(
      [] as unknown as QueueJob[]
    );
    const mod = await import("../check-note-queue-jobs");
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    await mod.runCli(["note-xyz"]);
    expect(getQueueJobByNoteId).toHaveBeenCalledWith("note-xyz");
    expect(logSpy).toHaveBeenCalled();
    logSpy.mockRestore();
  });

  it("runCli error path rethrows and logs", async () => {
    const { getQueueJobByNoteId } = await import("@peas/database");
    vi.mocked(getQueueJobByNoteId).mockRejectedValue(new Error("cli err"));
    const mod = await import("../check-note-queue-jobs");
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(mod.runCli(["note-err"])).rejects.toThrow("cli err");
    expect(errSpy).toHaveBeenCalled();
    errSpy.mockRestore();
  });

  it("handles database error in checkNoteQueueJobs and rethrows", async () => {
    const { getQueueJobByNoteId } = await import("@peas/database");
    const dbError = new Error("Database connection failed");
    vi.mocked(getQueueJobByNoteId).mockRejectedValue(dbError);
    
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const { checkNoteQueueJobs } = await import("../check-note-queue-jobs");
    
    await expect(checkNoteQueueJobs("note-error")).rejects.toThrow("Database connection failed");
    expect(consoleError).toHaveBeenCalledWith("Error checking QueueJobs for note:", dbError);
    
    consoleError.mockRestore();
  });

  it("runCli handles missing noteId parameter", async () => {
    const mod = await import("../check-note-queue-jobs");
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    
    await expect(mod.runCli([])).rejects.toThrow("Note ID is required");
    expect(errSpy).toHaveBeenCalledWith("Usage: node check-note-queue-jobs.ts <noteId>");
    
    errSpy.mockRestore();
  });
});
