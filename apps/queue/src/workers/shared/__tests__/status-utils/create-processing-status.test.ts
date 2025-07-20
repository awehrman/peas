import { describe, it, expect } from "vitest";
import { StatusUtils } from "../../status-utils";
import { WORKER_CONSTANTS } from "../../constants";

describe("StatusUtils - createProcessingStatus", () => {
  it("should create a processing status with all required fields", () => {
    const data = {
      importId: "import-123",
      noteId: "note-456",
      message: "Processing started",
      context: "test-context",
      indentLevel: 2,
      metadata: { key: "value" },
    };

    const result = StatusUtils.createProcessingStatus(data);

    expect(result).toEqual({
      importId: "import-123",
      noteId: "note-456",
      status: "PROCESSING",
      message: "Processing started",
      context: "test-context",
      indentLevel: 2,
      metadata: { key: "value" },
    });
  });

  it("should use default context when not provided", () => {
    const data = {
      importId: "import-123",
      message: "Processing started",
    };

    const result = StatusUtils.createProcessingStatus(data);

    expect(result).toEqual({
      importId: "import-123",
      noteId: undefined,
      status: "PROCESSING",
      message: "Processing started",
      context: WORKER_CONSTANTS.STATUS_CONTEXTS.PROCESSING,
      indentLevel: WORKER_CONSTANTS.INDENT_LEVELS.MAIN_OPERATION,
      metadata: undefined,
    });
  });

  it("should use default indent level when not provided", () => {
    const data = {
      importId: "import-123",
      message: "Processing started",
      context: "custom-context",
    };

    const result = StatusUtils.createProcessingStatus(data);

    expect(result).toEqual({
      importId: "import-123",
      noteId: undefined,
      status: "PROCESSING",
      message: "Processing started",
      context: "custom-context",
      indentLevel: WORKER_CONSTANTS.INDENT_LEVELS.MAIN_OPERATION,
      metadata: undefined,
    });
  });

  it("should handle optional noteId", () => {
    const data = {
      importId: "import-123",
      message: "Processing started",
    };

    const result = StatusUtils.createProcessingStatus(data);

    expect(result.noteId).toBeUndefined();
  });

  it("should handle optional metadata", () => {
    const data = {
      importId: "import-123",
      message: "Processing started",
    };

    const result = StatusUtils.createProcessingStatus(data);

    expect(result.metadata).toBeUndefined();
  });
});
