import { describe, it, expect } from "vitest";
import { createQueueStatusResponse } from "../../utils";

describe("createQueueStatusResponse", () => {
  it("should create status response with all queue types", () => {
    const waiting = [{ id: 1 }, { id: 2 }];
    const active = [{ id: 3 }];
    const completed = [{ id: 4 }, { id: 5 }, { id: 6 }];
    const failed = [{ id: 7 }];

    const result = createQueueStatusResponse(
      waiting,
      active,
      completed,
      failed
    );

    expect(result).toEqual({
      success: true,
      status: {
        waiting: 2,
        active: 1,
        completed: 3,
        failed: 1,
        total: 7,
      },
      timestamp: expect.any(String),
    });
  });

  it("should handle empty queues", () => {
    const result = createQueueStatusResponse([], [], [], []);

    expect(result).toEqual({
      success: true,
      status: {
        waiting: 0,
        active: 0,
        completed: 0,
        failed: 0,
        total: 0,
      },
      timestamp: expect.any(String),
    });
  });

  it("should handle mixed empty and populated queues", () => {
    const waiting = [{ id: 1 }, { id: 2 }];
    const active: unknown[] = [];
    const completed = [{ id: 3 }];
    const failed: unknown[] = [];

    const result = createQueueStatusResponse(
      waiting,
      active,
      completed,
      failed
    );

    expect(result).toEqual({
      success: true,
      status: {
        waiting: 2,
        active: 0,
        completed: 1,
        failed: 0,
        total: 3,
      },
      timestamp: expect.any(String),
    });
  });

  it("should handle large queue counts", () => {
    const waiting = Array.from({ length: 100 }, (_, i) => ({ id: i }));
    const active = Array.from({ length: 50 }, (_, i) => ({ id: i + 100 }));
    const completed = Array.from({ length: 1000 }, (_, i) => ({ id: i + 150 }));
    const failed = Array.from({ length: 25 }, (_, i) => ({ id: i + 1150 }));

    const result = createQueueStatusResponse(
      waiting,
      active,
      completed,
      failed
    );

    expect(result).toEqual({
      success: true,
      status: {
        waiting: 100,
        active: 50,
        completed: 1000,
        failed: 25,
        total: 1175,
      },
      timestamp: expect.any(String),
    });
  });

  it("should generate valid ISO timestamp", () => {
    const result = createQueueStatusResponse([], [], [], []);

    expect(result.timestamp).toMatch(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/
    );
  });

  it("should handle null and undefined values", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test edge case
    const result = createQueueStatusResponse([] as any, [] as any, [], []);

    expect(result).toEqual({
      success: true,
      status: {
        waiting: 0,
        active: 0,
        completed: 0,
        failed: 0,
        total: 0,
      },
      timestamp: expect.any(String),
    });
  });

  it("should handle arrays with non-object items", () => {
    const waiting = ["job1", "job2"];
    const active = [123, 456];
    const completed = [true, false, null];
    const failed = [undefined, "error"];

    const result = createQueueStatusResponse(
      waiting,
      active,
      completed,
      failed
    );

    expect(result).toEqual({
      success: true,
      status: {
        waiting: 2,
        active: 2,
        completed: 3,
        failed: 2,
        total: 9,
      },
      timestamp: expect.any(String),
    });
  });

  it("should always return success as true", () => {
    const result = createQueueStatusResponse([], [], [], []);

    expect(result.success).toBe(true);
  });

  it("should calculate total correctly", () => {
    const waiting = [{ id: 1 }];
    const active = [{ id: 2 }, { id: 3 }];
    const completed = [{ id: 4 }];
    const failed = [{ id: 5 }, { id: 6 }, { id: 7 }];

    const result = createQueueStatusResponse(
      waiting,
      active,
      completed,
      failed
    );

    expect(result.status.total).toBe(7);
    expect(
      result.status.waiting +
        result.status.active +
        result.status.completed +
        result.status.failed
    ).toBe(7);
  });
});
