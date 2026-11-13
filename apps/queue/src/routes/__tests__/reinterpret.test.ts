import * as database from "@peas/database";
import { PARSER_VERSION } from "@peas/parser/v2";
import type { Application } from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { publishLexiconRevision } from "../../services/ingredient/lexicon-cache";
import { enqueueSnapshot } from "../../services/reinterpret/service";
import { createTestApp } from "../../test-utils/helpers";
import { reinterpretRouter } from "../reinterpret";

const add = vi.fn(async () => undefined);

vi.mock("../../services/container", () => ({
  ServiceContainer: {
    getInstance: vi.fn(async () => ({ queues: { reinterpretQueue: { add } } })),
  },
}));

vi.mock("../../services/ingredient/lexicon-cache", () => ({
  publishLexiconRevision: vi.fn(async () => undefined),
}));

const run = {
  jobId: "reinterpret-15",
  kind: "REINTERPRET_BY_REVISION",
  revision: 15,
  status: "PENDING",
  processedLines: 0,
  totalLines: 0,
};

vi.mock("../../services/reinterpret/service", () => ({
  enqueueSnapshot: vi.fn(async () => undefined),
}));

vi.mock("@peas/database", () => ({
  requestReinterpretRun: vi.fn(async () => run),
  getReinterpretRun: vi.fn(async () => run),
  reinterpretJobId: vi.fn(
    (input: { revision: number }) => `reinterpret-${input.revision}`
  ),
}));

describe("reinterpret routes", () => {
  let app: Application;

  beforeEach(() => {
    vi.clearAllMocks();
    app = createTestApp();
    app.use("/reinterpret", reinterpretRouter);
  });

  it("starts a run once, with a deterministic job id, and announces the revision", async () => {
    const response = await request(app)
      .post("/reinterpret")
      .send({ revision: 15, phrases: ["icing sugar"] });

    expect(response.status).toBe(202);
    expect(response.body).toEqual({
      success: true,
      jobId: "reinterpret-15",
      status: "PENDING",
    });
    expect(database.requestReinterpretRun).toHaveBeenCalledWith({
      kind: "REINTERPRET_BY_REVISION",
      revision: 15,
      scope: { phrases: ["icing sugar"], conceptIds: [] },
    });
    expect(add).toHaveBeenCalledWith(
      "reinterpret-run",
      {
        jobId: "reinterpret-15",
        runJobId: "reinterpret-15",
        kind: "REINTERPRET_BY_REVISION",
        revision: 15,
      },
      expect.objectContaining({ jobId: "reinterpret-15", attempts: 3 })
    );
    expect(publishLexiconRevision).toHaveBeenCalledWith(15);

    vi.mocked(database.requestReinterpretRun).mockResolvedValueOnce({
      ...run,
      status: "PROCESSING",
    } as never);
    await request(app).post("/reinterpret").send({ revision: 15 });
    expect(add).toHaveBeenCalledTimes(1);
  });

  it("still accepts the run when the revision broadcast fails", async () => {
    vi.mocked(publishLexiconRevision).mockRejectedValueOnce(
      new Error("redis down")
    );
    const response = await request(app)
      .post("/reinterpret")
      .send({ revision: 17 });
    expect(response.status).toBe(202);
  });

  it("validates input and reports failures", async () => {
    expect(
      (await request(app).post("/reinterpret").send({ revision: "x" })).status
    ).toBe(400);
    vi.mocked(database.requestReinterpretRun).mockRejectedValueOnce(
      new Error("db down")
    );
    const failed = await request(app)
      .post("/reinterpret")
      .send({ revision: 16 });
    expect(failed.status).toBe(500);
    expect(failed.body.error).toBe("db down");
  });

  it("reports run status by revision", async () => {
    const ok = await request(app).get("/reinterpret/15/status");
    expect(ok.status).toBe(200);
    expect(ok.body).toMatchObject({
      success: true,
      jobId: "reinterpret-15",
      status: "PENDING",
    });

    vi.mocked(database.getReinterpretRun).mockResolvedValueOnce(null);
    expect((await request(app).get("/reinterpret/99/status")).status).toBe(404);
    expect((await request(app).get("/reinterpret/abc/status")).status).toBe(
      400
    );
  });

  it("publishes lexicon revisions", async () => {
    const ok = await request(app)
      .post("/reinterpret/lexicon-revision")
      .send({ revision: 15 });
    expect(ok.body).toEqual({ success: true });
    expect(publishLexiconRevision).toHaveBeenCalledWith(15);

    expect(
      (await request(app).post("/reinterpret/lexicon-revision").send({})).status
    ).toBe(400);
    vi.mocked(publishLexiconRevision).mockRejectedValueOnce(
      new Error("redis down")
    );
    expect(
      (
        await request(app)
          .post("/reinterpret/lexicon-revision")
          .send({ revision: 2 })
      ).status
    ).toBe(500);
    vi.mocked(publishLexiconRevision).mockRejectedValueOnce("offline");
    const unknown = await request(app)
      .post("/reinterpret/lexicon-revision")
      .send({ revision: 3 });
    expect(unknown.body.error).toBe("Could not publish the revision");
    vi.mocked(database.requestReinterpretRun).mockRejectedValueOnce("offline");
    const failed = await request(app)
      .post("/reinterpret")
      .send({ revision: 18 });
    expect(failed.body.error).toBe("Could not start reinterpretation");
  });

  it("starts a reparse once per parser version, defaulting to the running parser", async () => {
    vi.mocked(database.requestReinterpretRun).mockResolvedValueOnce({
      ...run,
      jobId: `reparse-${PARSER_VERSION}`,
    } as never);
    const response = await request(app).post("/reinterpret/reparse").send({});
    expect(response.status).toBe(202);
    expect(response.body).toEqual({
      success: true,
      jobId: `reparse-${PARSER_VERSION}`,
      status: "PENDING",
    });
    expect(database.requestReinterpretRun).toHaveBeenCalledWith({
      kind: "REPARSE_BY_VERSION",
      parserVersion: PARSER_VERSION,
    });
    expect(add).toHaveBeenCalledWith(
      "reinterpret-run",
      {
        jobId: `reparse-${PARSER_VERSION}`,
        runJobId: `reparse-${PARSER_VERSION}`,
        kind: "REPARSE_BY_VERSION",
        parserVersion: PARSER_VERSION,
      },
      expect.objectContaining({ attempts: 3 })
    );

    vi.mocked(database.requestReinterpretRun).mockResolvedValueOnce({
      ...run,
      jobId: "reparse-2.0.0",
      status: "COMPLETED",
    } as never);
    const repeated = await request(app)
      .post("/reinterpret/reparse")
      .send({ parserVersion: "2.0.0" });
    expect(repeated.body.status).toBe("COMPLETED");
    expect(add).toHaveBeenCalledTimes(1);

    expect(
      (
        await request(app)
          .post("/reinterpret/reparse")
          .send({ parserVersion: "two" })
      ).status
    ).toBe(400);
    vi.mocked(database.requestReinterpretRun).mockRejectedValueOnce("offline");
    const failed = await request(app).post("/reinterpret/reparse").send({});
    expect(failed.status).toBe(500);
    expect(failed.body.error).toBe("Could not start the reparse");
  });

  it("runs a sweep and takes a snapshot on request", async () => {
    const sweep = await request(app).post("/reinterpret/sweep");
    expect(sweep.status).toBe(202);
    expect(sweep.body.jobId).toMatch(/^exploratory-sweep-\d+$/);
    expect(add).toHaveBeenCalledWith(
      "exploratory-sweep",
      expect.objectContaining({
        kind: "EXPLORATORY_SWEEP",
        jobId: sweep.body.jobId,
      }),
      expect.objectContaining({ jobId: sweep.body.jobId })
    );

    const snapshot = await request(app).post("/reinterpret/snapshot");
    expect(snapshot.status).toBe(202);
    expect(enqueueSnapshot).toHaveBeenCalledWith(
      expect.objectContaining({ add }),
      "MANUAL"
    );

    add.mockRejectedValueOnce(new Error("redis down"));
    expect((await request(app).post("/reinterpret/sweep")).body.error).toBe(
      "redis down"
    );
    add.mockRejectedValueOnce("offline");
    expect((await request(app).post("/reinterpret/sweep")).body.error).toBe(
      "Could not start the sweep"
    );
    vi.mocked(enqueueSnapshot).mockRejectedValueOnce("offline");
    expect((await request(app).post("/reinterpret/snapshot")).body.error).toBe(
      "Could not take a snapshot"
    );
    vi.mocked(enqueueSnapshot).mockRejectedValueOnce(new Error("queue closed"));
    expect((await request(app).post("/reinterpret/snapshot")).body.error).toBe(
      "queue closed"
    );
    vi.mocked(database.requestReinterpretRun).mockRejectedValueOnce(
      new Error("db down")
    );
    expect(
      (await request(app).post("/reinterpret/reparse").send({})).body.error
    ).toBe("db down");
  });
});
