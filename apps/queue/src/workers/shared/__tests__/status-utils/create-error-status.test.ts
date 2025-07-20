import { describe, it, expect } from "vitest";
import { StatusUtils } from "../../status-utils";
import { WORKER_CONSTANTS } from "../../constants";

describe("StatusUtils - createErrorStatus", () => {
  it("should create an error status with all required fields", () => {
    const data = {
      importId: "import-123",
      noteId: "note-456",
      message: "Something went wrong",
      context: "test-context",
      indentLevel: 1,
      metadata: { key: "value" },
    };

    const result = StatusUtils.createErrorStatus(data);

    expect(result).toEqual({
      importId: "import-123",
      noteId: "note-456",
      status: "FAILED",
      message: `${WORKER_CONSTANTS.EMOJIS.ERROR} Something went wrong`,
      context: "test-context",
      indentLevel: 1,
      metadata: { key: "value" },
    });
  });

  it("should use default context when not provided", () => {
    const data = {
      importId: "import-123",
      message: "Something went wrong",
    };

    const result = StatusUtils.createErrorStatus(data);

    expect(result).toEqual({
      importId: "import-123",
      noteId: undefined,
      status: "FAILED",
      message: `${WORKER_CONSTANTS.EMOJIS.ERROR} Something went wrong`,
      context: WORKER_CONSTANTS.STATUS_CONTEXTS.ERROR,
      indentLevel: WORKER_CONSTANTS.INDENT_LEVELS.MAIN_OPERATION,
      metadata: undefined,
    });
  });

  it("should use default indent level when not provided", () => {
    const data = {
      importId: "import-123",
      message: "Something went wrong",
      context: "custom-context",
    };

    const result = StatusUtils.createErrorStatus(data);

    expect(result).toEqual({
      importId: "import-123",
      noteId: undefined,
      status: "FAILED",
      message: `${WORKER_CONSTANTS.EMOJIS.ERROR} Something went wrong`,
      context: "custom-context",
      indentLevel: WORKER_CONSTANTS.INDENT_LEVELS.MAIN_OPERATION,
      metadata: undefined,
    });
  });

  it("should handle optional noteId", () => {
    const data = {
      importId: "import-123",
      message: "Something went wrong",
    };

    const result = StatusUtils.createErrorStatus(data);

    expect(result.noteId).toBeUndefined();
  });

  it("should handle optional metadata", () => {
    const data = {
      importId: "import-123",
      message: "Something went wrong",
    };

    const result = StatusUtils.createErrorStatus(data);

    expect(result.metadata).toBeUndefined();
  });

  it("should handle empty error message", () => {
    const data = {
      importId: "import-123",
      message: "",
    };

    const result = StatusUtils.createErrorStatus(data);

    expect(result.message).toBe(`${WORKER_CONSTANTS.EMOJIS.ERROR} `);
  });

  it("should handle long error messages", () => {
    const longMessage = "A".repeat(1000);
    const data = {
      importId: "import-123",
      message: longMessage,
    };

    const result = StatusUtils.createErrorStatus(data);

    expect(result.message).toBe(
      `${WORKER_CONSTANTS.EMOJIS.ERROR} ${longMessage}`
    );
  });
});
