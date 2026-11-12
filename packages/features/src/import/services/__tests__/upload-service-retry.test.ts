import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createMockFetchResponse } from "../../../test-utils/factories";
import type { FileGroup } from "../../validation/file-validation";
import { UploadService } from "../upload-service";

const mockFetch = vi.fn();
global.fetch = mockFetch;

const group: FileGroup = {
  importId: "import-1",
  htmlFile: {
    name: "Venison/Venison Stew.html",
    type: "text/html",
    size: 10,
    file: new File(["<html></html>"], "Venison Stew.html", { type: "text/html" }),
  },
  imageFiles: [],
};

function rateLimitedResponse(retryAfterSeconds: number): Response {
  const response = createMockFetchResponse({ error: "Too many requests", retryAfter: retryAfterSeconds }, 429, false);
  return { ...response, clone: () => response } as Response;
}

describe("UploadService retries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("waits the server's retryAfter and retries a rate-limited upload", async () => {
    mockFetch
      .mockResolvedValueOnce(rateLimitedResponse(3))
      .mockResolvedValueOnce(createMockFetchResponse({ importId: "import-1" }));
    const onProgress = vi.fn();

    const upload = UploadService.uploadFileGroup(group, onProgress);
    await vi.advanceTimersByTimeAsync(2999);
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(onProgress).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Queue is busy; retrying in 3s..." })
    );

    await vi.advanceTimersByTimeAsync(1);
    await upload;

    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(onProgress).toHaveBeenLastCalledWith(expect.objectContaining({ status: "completed" }));
  });

  it("gives up after five rate-limited attempts", async () => {
    mockFetch.mockResolvedValue(rateLimitedResponse(1));

    const upload = UploadService.uploadFileGroup(group).catch((error: Error) => error);
    await vi.advanceTimersByTimeAsync(10_000);

    expect(mockFetch).toHaveBeenCalledTimes(5);
    expect(await upload).toBeInstanceOf(Error);
  });

  it("explains an oversized note instead of retrying it", async () => {
    mockFetch.mockResolvedValue(createMockFetchResponse({ error: "Request too large" }, 413, false));

    const error = (await UploadService.uploadFileGroup(group).catch((caught: unknown) => caught)) as {
      userMessage?: string;
    };

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(error.userMessage).toBe(
      "Venison/Venison Stew.html and its images are too large to upload in one request"
    );
  });
});
