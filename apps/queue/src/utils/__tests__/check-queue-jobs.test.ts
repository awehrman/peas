import type { QueueJob } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@peas/database", () => ({
  getQueueJobByStatus: vi.fn(),
}));

describe("check-queue-jobs util", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("prints counts and samples for each status plus categorization summary", async () => {
    const { getQueueJobByStatus } = await import("@peas/database");
    const now = new Date();
    const mk = (over: Partial<QueueJob>): Partial<QueueJob> => ({
      jobId: over.jobId ?? "j",
      type: (over.type as QueueJob["type"]) ?? "PROCESS_IMAGES",
      status: (over.status as QueueJob["status"]) ?? "PENDING",
      createdAt: now,
      noteId: over.noteId ?? "n",
      errorMessage: over.errorMessage,
    });

    vi.mocked(getQueueJobByStatus)
      .mockResolvedValueOnce([
        mk({ jobId: "p1", status: "PENDING" }),
      ] as unknown as QueueJob[]) // pending
      .mockResolvedValueOnce([
        mk({ jobId: "x1", status: "PROCESSING" }),
      ] as unknown as QueueJob[]) // processing
      .mockResolvedValueOnce([
        mk({
          jobId: "c1",
          status: "COMPLETED",
          type: "PROCESS_CATEGORIZATION",
        }),
        mk({ jobId: "c2", status: "COMPLETED" }),
      ] as unknown as QueueJob[]) // completed
      .mockResolvedValueOnce([
        mk({ jobId: "f1", status: "FAILED", errorMessage: "oops" }),
        mk({ jobId: "f2", status: "FAILED", type: "PROCESS_CATEGORIZATION" }),
      ] as unknown as QueueJob[]); // failed

    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const err = vi.spyOn(console, "error").mockImplementation(() => {});

    const { checkQueueJobs } = await import("../check-queue-jobs");
    await checkQueueJobs();

    expect(getQueueJobByStatus).toHaveBeenNthCalledWith(1, "PENDING");
    expect(getQueueJobByStatus).toHaveBeenNthCalledWith(2, "PROCESSING");
    expect(getQueueJobByStatus).toHaveBeenNthCalledWith(3, "COMPLETED");
    expect(getQueueJobByStatus).toHaveBeenNthCalledWith(4, "FAILED");

    expect(
      log.mock.calls.some((c) => String(c[0]).includes("📋 PENDING jobs: 1"))
    ).toBe(true);
    expect(
      log.mock.calls.some((c) =>
        String(c[0]).includes("⚙️  PROCESSING jobs: 1")
      )
    ).toBe(true);
    expect(
      log.mock.calls.some((c) => String(c[0]).includes("✅ COMPLETED jobs: 2"))
    ).toBe(true);
    expect(
      log.mock.calls.some((c) => String(c[0]).includes("❌ FAILED jobs: 2"))
    ).toBe(true);
    expect(
      log.mock.calls.some((c) => String(c[0]).includes("Categorization jobs:"))
    ).toBe(true);
    expect(log.mock.calls.some((c) => String(c[0]).includes("Total: 2"))).toBe(
      true
    );

    expect(err).not.toHaveBeenCalled();
    log.mockRestore();
    err.mockRestore();
  });

  it("logs error on failure", async () => {
    const { getQueueJobByStatus } = await import("@peas/database");
    vi.mocked(getQueueJobByStatus).mockRejectedValueOnce(new Error("fail"));
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    const { checkQueueJobs } = await import("../check-queue-jobs");
    await expect(checkQueueJobs()).rejects.toThrow("fail");
    expect(err).toHaveBeenCalled();
    err.mockRestore();
  });

  it("covers CLI wrapper happy and error paths", async () => {
    const { getQueueJobByStatus } = await import("@peas/database");
    // Happy path
    vi.mocked(getQueueJobByStatus)
      .mockResolvedValueOnce([] as unknown as QueueJob[])
      .mockResolvedValueOnce([] as unknown as QueueJob[])
      .mockResolvedValueOnce([] as unknown as QueueJob[])
      .mockResolvedValueOnce([] as unknown as QueueJob[]);
    const mod = await import("../check-queue-jobs");
    await mod.runCli();

    // Error path
    vi.mocked(getQueueJobByStatus).mockRejectedValueOnce(new Error("boom"));
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(mod.runCli()).rejects.toThrow("boom");
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});
