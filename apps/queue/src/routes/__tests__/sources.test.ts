import type { Application } from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createTestApp } from "../../test-utils/helpers";
import { sourcesRouter } from "../sources";

const sourceAdd = vi.fn(async () => undefined);
const bookLookupAdd = vi.fn(async () => undefined);
const categorizationAdd = vi.fn(async () => undefined);

vi.mock("../../services/container", () => ({
  ServiceContainer: {
    getInstance: vi.fn(async () => ({
      queues: {
        sourceQueue: { add: sourceAdd },
        bookLookupQueue: { add: bookLookupAdd },
        categorizationQueue: { add: categorizationAdd },
      },
    })),
  },
}));

vi.mock("@peas/database", () => ({
  getCategory: vi.fn(async (id: string) => (id === "c1" ? { id: "c1", ruleVersion: 3 } : null)),
}));

describe("sources routes", () => {
  let app: Application;

  beforeEach(() => {
    vi.clearAllMocks();
    app = createTestApp();
    app.use("/sources", sourcesRouter);
  });

  it("queues a URL recheck keyed by the URL", async () => {
    const response = await request(app).post("/sources/url-check").send({ urlId: "u1" });
    expect(response.status).toBe(202);
    expect(response.body).toEqual({ success: true, jobId: "url-check-u1" });
    expect(sourceAdd).toHaveBeenCalledWith("check-url", expect.objectContaining({ urlId: "u1" }), expect.objectContaining({ jobId: "url-check-u1" }));
  });

  it("validates input and reports queue failures as 500s", async () => {
    expect((await request(app).post("/sources/url-check").send({})).status).toBe(400);

    sourceAdd.mockRejectedValueOnce(new Error("redis down"));
    const failed = await request(app).post("/sources/url-check").send({ urlId: "u1" });
    expect(failed.status).toBe(500);
    expect(failed.body).toEqual({ success: false, error: "redis down" });

    bookLookupAdd.mockRejectedValueOnce(new Error("redis down"));
    const lookupFailed = await request(app)
      .post("/sources/book-lookup")
      .send({ lookupId: "0193a1b2-c3d4-7e5f-8a9b-0c1d2e3f4a5b" });
    expect(lookupFailed.status).toBe(500);

    categorizationAdd.mockRejectedValueOnce(new Error("redis down"));
    expect((await request(app).post("/sources/categories/recompute").send({ noteId: "n1" })).status).toBe(500);
  }, 15_000);

  it("validates book lookup ids", async () => {
    expect((await request(app).post("/sources/book-lookup").send({ lookupId: "nope" })).status).toBe(400);
    const lookupId = "0193a1b2-c3d4-7e5f-8a9b-0c1d2e3f4a5b";
    const response = await request(app).post("/sources/book-lookup").send({ lookupId });
    expect(response.body).toEqual({ success: true, jobId: `book-lookup-${lookupId}` });
  });

  it("queues category recomputes by note, by rule version, and after knowledge changes", async () => {
    await request(app).post("/sources/categories/recompute").send({ noteId: "n1" });
    await request(app).post("/sources/categories/recompute").send({ categoryId: "c1" });
    await request(app).post("/sources/categories/recompute").send({ all: true, reason: "revision-15" });
    expect(categorizationAdd.mock.calls.map((call) => (call as unknown[])[2])).toEqual([
      expect.objectContaining({ jobId: "categories-note-n1" }),
      expect.objectContaining({ jobId: "categories-category-c1-v3" }),
      expect.objectContaining({ jobId: "categories-all-revision-15" }),
    ]);

    expect((await request(app).post("/sources/categories/recompute").send({ categoryId: "missing" })).status).toBe(404);
    expect((await request(app).post("/sources/categories/recompute").send({})).status).toBe(400);
  }, 15_000);
});
