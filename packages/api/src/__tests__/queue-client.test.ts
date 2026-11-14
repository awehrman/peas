import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  fetchLiveParseMetrics,
  notifyLexiconRevision,
  postToQueue,
  queueUrl,
  requestBackgroundReinterpret,
} from "../queue-client";

const SECRET = "a-queue-secret-that-is-long-enough-123";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("queue client", () => {
  beforeEach(() => {
    vi.stubEnv("QUEUE_AUTH_SECRET", SECRET);
    vi.stubEnv("QUEUE_INTERNAL_URL", "http://queue.internal:4200/");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("uses QUEUE_INTERNAL_URL without a trailing slash, defaulting to localhost", () => {
    expect(queueUrl()).toBe("http://queue.internal:4200");
    vi.stubEnv("QUEUE_INTERNAL_URL", undefined);
    expect(queueUrl()).toBe("http://localhost:4200");
  });

  it("starts a background reinterpretation as the viewer and returns its job id", async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse(
        { success: true, jobId: "reinterpret-15", status: "PENDING" },
        202
      )
    );

    const jobId = await requestBackgroundReinterpret(
      15,
      { phrases: ["icing sugar"], conceptIds: ["c1"] },
      "u1",
      fetchImpl
    );

    expect(jobId).toBe("reinterpret-15");
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    expect(url).toBe("http://queue.internal:4200/reinterpret");
    expect(JSON.parse(String(init.body))).toEqual({
      revision: 15,
      phrases: ["icing sugar"],
      conceptIds: ["c1"],
    });
    const token = String(
      (init.headers as Record<string, string>).Authorization
    ).replace("Bearer ", "");
    const [payload] = token.split(".");
    expect(
      JSON.parse(Buffer.from(payload!, "base64url").toString())
    ).toMatchObject({
      sub: "u1",
    });
  });

  it("throws when the queue answers with an error", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ error: "nope" }, 500));
    await expect(
      postToQueue("/reinterpret", {}, "u1", fetchImpl)
    ).rejects.toThrow("The queue answered 500 for /reinterpret");
  });

  it("reads the live parse window and returns null when the queue fails", async () => {
    const live = { lineCount: 3, linesPerSecond: 0.001 };
    const ok = vi.fn(async () => jsonResponse({ success: true, data: { live } }));
    expect(await fetchLiveParseMetrics("u1", ok)).toEqual(live);
    expect(ok).toHaveBeenCalledWith(
      "http://queue.internal:4200/metrics/ingredients",
      expect.objectContaining({ headers: expect.any(Object) })
    );

    const failing = vi.fn(async () => jsonResponse({}, 503));
    expect(await fetchLiveParseMetrics("u1", failing)).toBeNull();
    const offline = vi.fn(async () => {
      throw new TypeError("fetch failed");
    });
    expect(await fetchLiveParseMetrics("u1", offline)).toBeNull();
  });

  it("ignores failures when announcing a lexicon revision", async () => {
    const fetchImpl = vi.fn(async () => {
      throw new TypeError("fetch failed");
    });
    await expect(
      notifyLexiconRevision(15, "u1", fetchImpl)
    ).resolves.toBeUndefined();
    expect(fetchImpl).toHaveBeenCalledWith(
      "http://queue.internal:4200/reinterpret/lexicon-revision",
      expect.objectContaining({ method: "POST" })
    );
  });
});
