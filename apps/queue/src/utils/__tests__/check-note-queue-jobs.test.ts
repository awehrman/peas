import type { QueueJob } from "@prisma/client";
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
        type: "PROCESS_CATEGORIZATION",
        status: "PENDING",
        createdAt: now,
      },
      {
        jobId: "j2",
        type: "PROCESS_CATEGORIZATION",
        status: "COMPLETED",
        createdAt: now,
        startedAt: now,
        completedAt: now,
      },
      {
        jobId: "j3",
        type: "PROCESS_IMAGES",
        status: "FAILED",
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
    await checkNoteQueueJobs("note-3");
    expect(consoleError).toHaveBeenCalled();
    consoleError.mockRestore();
  });
});
