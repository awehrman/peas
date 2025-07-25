import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  TEST_FIXTURES,
  createMockActionContext,
  createMockHtmlContent,
  createMockLogger,
  createMockNoteData,
  createMockQueue,
  createMockRedisConnection,
  createMockServiceContainer,
  createMockStatusBroadcaster,
  createMockWorker,
  expectCalledOnce,
  expectCalledWith,
  expectNeverCalled,
  flushPromises,
  setupTestEnvironment,
  wait,
} from "../test-utils";

describe("test-utils", () => {
  describe("mock creators", () => {
    it("should create a mock Queue with expected shape", () => {
      const queue = createMockQueue();
      expect(queue.name).toBe("test-queue");
      ["add", "close", "getJob", "getJobs", "getJobCounts"].forEach(
        (method) => {
          // @ts-expect-error index access for test
          expect(vi.isMockFunction(queue[method])).toBe(true);
        }
      );
    });

    it("should create a mock Worker with expected shape", () => {
      const worker = createMockWorker();
      ["close", "on", "off"].forEach((method) => {
        // @ts-expect-error index access for test
        expect(vi.isMockFunction(worker[method])).toBe(true);
      });
    });

    it("should create mock NotePipelineData with overrides", () => {
      const note = createMockNoteData({ importId: "override-id" });
      expect(note.importId).toBe("override-id");
      expect(note.content).toContain("Test Recipe");
    });

    it("should create mock ActionContext with overrides", () => {
      const ctx = createMockActionContext({ jobId: "override-job" });
      expect(ctx.jobId).toBe("override-job");
      expect(ctx.queueName).toBe("test-queue");
    });

    it("should create a mock logger and status broadcaster", () => {
      const logger = createMockLogger();
      Object.values(logger).forEach((fn) => {
        expect(vi.isMockFunction(fn)).toBe(true);
      });

      const broadcaster = createMockStatusBroadcaster();
      ["addStatusEventAndBroadcast", "broadcast"].forEach((method) => {
        // @ts-expect-error index access
        expect(vi.isMockFunction(broadcaster[method])).toBe(true);
      });
    });

    it("should create a mock service container with nested mocks", () => {
      const svc = createMockServiceContainer();
      expect(vi.isMockFunction(svc.logger.info)).toBe(true);
      expect(vi.isMockFunction(svc.cache.get)).toBe(true);
      expect(vi.isMockFunction(svc.database.note.create)).toBe(true);
    });

    it("should create a mock Redis connection with expected commands", () => {
      const redis = createMockRedisConnection();
      [
        "get",
        "set",
        "del",
        "exists",
        "mget",
        "mset",
        "keys",
        "quit",
        "scan",
      ].forEach((cmd) => {
        // @ts-expect-error index access
        expect(vi.isMockFunction(redis[cmd])).toBe(true);
      });
    });
  });

  describe("utility helpers", () => {
    it("wait() should resolve after specified ms using fake timers", async () => {
      vi.useFakeTimers();
      const spy = vi.fn();
      wait(100).then(spy);
      expect(spy).not.toHaveBeenCalled();
      vi.advanceTimersByTime(100);
      await vi.runAllTicks();
      expect(spy).toHaveBeenCalled();
      vi.useRealTimers();
    });

    it("flushPromises() should resolve on next tick", async () => {
      const spy = vi.fn();
      flushPromises().then(spy);
      expect(spy).not.toHaveBeenCalled();
      await new Promise((resolve) => setTimeout(resolve, 1));
      expect(spy).toHaveBeenCalled();
    });

    it("createMockHtmlContent should embed provided title", () => {
      const html = createMockHtmlContent("Custom Title");
      expect(html).toContain("Custom Title");
      expect(html).toContain("<html>");
    });
  });

  describe("assertion helpers", () => {
    it("expectCalledWith / Once / Never should behave correctly", () => {
      const fn = vi.fn();
      fn(1, 2);
      expectCalledWith(fn, [1, 2]);
      expectCalledOnce(fn);
      const never = vi.fn();
      expectNeverCalled(never);
    });
  });

  describe("setupTestEnvironment", () => {
    beforeEach(() => {
      vi.restoreAllMocks();
    });

    it("should spy on console and set env vars", () => {
      const { cleanup } = setupTestEnvironment();
      console.log("hello");
      expect(vi.isMockFunction(console.log)).toBe(true);
      expect(process.env.NODE_ENV).toBe("test");
      cleanup();
      // After cleanup spies should be restored
      expect(vi.isMockFunction(console.log)).toBe(false);
    });
  });

  describe("TEST_FIXTURES", () => {
    it("should contain expected HTML snippets", () => {
      expect(TEST_FIXTURES.validHtml).toContain("Valid Recipe");
      expect(TEST_FIXTURES.invalidHtml).toContain("<invalid>");
      expect(TEST_FIXTURES.emptyHtml).toBe("");
    });
  });
});
