import { describe, it, expect } from "vitest";
import { StatusUtils } from "../../status-utils";
import { WORKER_CONSTANTS } from "../../constants";

describe("StatusUtils - createProgressStatus", () => {
  it("should create a processing progress status when not complete", () => {
    const data = {
      importId: "import-123",
      noteId: "note-456",
      current: 3,
      total: 10,
      itemType: "ingredients",
      context: "test-context",
      indentLevel: 2,
      metadata: { key: "value" },
    };

    const result = StatusUtils.createProgressStatus(data);

    expect(result).toEqual({
      importId: "import-123",
      noteId: "note-456",
      status: "PROCESSING",
      message: `${WORKER_CONSTANTS.EMOJIS.PROCESSING} 3/10 ingredients`,
      context: "test-context",
      indentLevel: 2,
      metadata: {
        key: "value",
        current: 3,
        total: 10,
        isComplete: false,
      },
    });
  });

  it("should create a completion status when progress is complete", () => {
    const data = {
      importId: "import-123",
      noteId: "note-456",
      current: 10,
      total: 10,
      itemType: "ingredients",
      context: "test-context",
      indentLevel: 2,
      metadata: { key: "value" },
    };

    const result = StatusUtils.createProgressStatus(data);

    expect(result).toEqual({
      importId: "import-123",
      noteId: "note-456",
      status: "COMPLETED",
      message: `${WORKER_CONSTANTS.EMOJIS.SUCCESS} 10/10 ingredients`,
      context: "test-context",
      indentLevel: 2,
      metadata: {
        key: "value",
        current: 10,
        total: 10,
        isComplete: true,
      },
    });
  });

  it("should use default indent level when not provided", () => {
    const data = {
      importId: "import-123",
      current: 5,
      total: 10,
      itemType: "ingredients",
      context: "test-context",
    };

    const result = StatusUtils.createProgressStatus(data);

    expect(result).toEqual({
      importId: "import-123",
      noteId: undefined,
      status: "PROCESSING",
      message: `${WORKER_CONSTANTS.EMOJIS.PROCESSING} 5/10 ingredients`,
      context: "test-context",
      indentLevel: WORKER_CONSTANTS.INDENT_LEVELS.SUB_OPERATION,
      metadata: {
        current: 5,
        total: 10,
        isComplete: false,
      },
    });
  });

  it("should handle optional noteId", () => {
    const data = {
      importId: "import-123",
      current: 5,
      total: 10,
      itemType: "ingredients",
      context: "test-context",
    };

    const result = StatusUtils.createProgressStatus(data);

    expect(result.noteId).toBeUndefined();
  });

  it("should handle optional metadata", () => {
    const data = {
      importId: "import-123",
      current: 5,
      total: 10,
      itemType: "ingredients",
      context: "test-context",
    };

    const result = StatusUtils.createProgressStatus(data);

    expect(result.metadata).toEqual({
      current: 5,
      total: 10,
      isComplete: false,
    });
  });

  it("should handle zero progress", () => {
    const data = {
      importId: "import-123",
      current: 0,
      total: 10,
      itemType: "ingredients",
      context: "test-context",
    };

    const result = StatusUtils.createProgressStatus(data);

    expect(result.status).toBe("PROCESSING");
    expect(result.message).toBe(
      `${WORKER_CONSTANTS.EMOJIS.PROCESSING} 0/10 ingredients`
    );
    expect(result.metadata?.isComplete).toBe(false);
  });

  it("should handle single item progress", () => {
    const data = {
      importId: "import-123",
      current: 1,
      total: 1,
      itemType: "ingredient",
      context: "test-context",
    };

    const result = StatusUtils.createProgressStatus(data);

    expect(result.status).toBe("COMPLETED");
    expect(result.message).toBe(
      `${WORKER_CONSTANTS.EMOJIS.SUCCESS} 1/1 ingredient`
    );
    expect(result.metadata?.isComplete).toBe(true);
  });

  it("should handle large numbers", () => {
    const data = {
      importId: "import-123",
      current: 999,
      total: 1000,
      itemType: "items",
      context: "test-context",
    };

    const result = StatusUtils.createProgressStatus(data);

    expect(result.status).toBe("PROCESSING");
    expect(result.message).toBe(
      `${WORKER_CONSTANTS.EMOJIS.PROCESSING} 999/1000 items`
    );
    expect(result.metadata?.isComplete).toBe(false);
  });
});
