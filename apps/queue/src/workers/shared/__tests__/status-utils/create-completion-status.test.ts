import { describe, it, expect } from "vitest";
import { StatusUtils } from "../../status-utils";
import { WORKER_CONSTANTS } from "../../constants";

describe("StatusUtils - createCompletionStatus", () => {
  it("should create a completion status with all required fields", () => {
    const data = {
      importId: "import-123",
      noteId: "note-456",
      message: "Processing completed",
      context: "test-context",
      indentLevel: 0,
      metadata: { key: "value" },
    };

    const result = StatusUtils.createCompletionStatus(data);

    expect(result).toEqual({
      importId: "import-123",
      noteId: "note-456",
      status: "COMPLETED",
      message: "Processing completed",
      context: "test-context",
      indentLevel: 0,
      metadata: { key: "value" },
    });
  });

  it("should use default context when not provided", () => {
    const data = {
      importId: "import-123",
      message: "Processing completed",
    };

    const result = StatusUtils.createCompletionStatus(data);

    expect(result).toEqual({
      importId: "import-123",
      noteId: undefined,
      status: "COMPLETED",
      message: "Processing completed",
      context: WORKER_CONSTANTS.STATUS_CONTEXTS.IMPORT_COMPLETE,
      indentLevel: WORKER_CONSTANTS.INDENT_LEVELS.TOP_LEVEL,
      metadata: undefined,
    });
  });

  it("should use default indent level when not provided", () => {
    const data = {
      importId: "import-123",
      message: "Processing completed",
      context: "custom-context",
    };

    const result = StatusUtils.createCompletionStatus(data);

    expect(result).toEqual({
      importId: "import-123",
      noteId: undefined,
      status: "COMPLETED",
      message: "Processing completed",
      context: "custom-context",
      indentLevel: WORKER_CONSTANTS.INDENT_LEVELS.TOP_LEVEL,
      metadata: undefined,
    });
  });

  it("should handle optional noteId", () => {
    const data = {
      importId: "import-123",
      message: "Processing completed",
    };

    const result = StatusUtils.createCompletionStatus(data);

    expect(result.noteId).toBeUndefined();
  });

  it("should handle optional metadata", () => {
    const data = {
      importId: "import-123",
      message: "Processing completed",
    };

    const result = StatusUtils.createCompletionStatus(data);

    expect(result.metadata).toBeUndefined();
  });
});
