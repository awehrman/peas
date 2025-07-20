import { describe, it, expect, beforeEach, vi } from "vitest";
import { CompletionStatusAction } from "../../completion-status-action";

// Create a concrete implementation for testing
class TestCompletionStatusAction extends CompletionStatusAction<{
  importId: string;
  noteId?: string;
  message: string;
  metadata: Record<string, unknown>;
}> {
  name = "test_completion_status";

  protected getCompletionMessage(data: { message: string }): string {
    return data.message;
  }

  protected getCompletionContext(): string {
    return "test_context";
  }

  protected getImportId(data: { importId: string }): string {
    return data.importId;
  }

  protected getNoteId(data: { noteId?: string }): string | undefined {
    return data.noteId;
  }

  protected getCompletionMetadata(data: {
    metadata: Record<string, unknown>;
  }): Record<string, unknown> {
    return data.metadata;
  }
}

describe("CompletionStatusAction - action properties", () => {
  let action: TestCompletionStatusAction;

  beforeEach(() => {
    vi.clearAllMocks();
    action = new TestCompletionStatusAction();
  });

  it("should have correct name", () => {
    expect(action.name).toBe("test_completion_status");
  });

  it("should be retryable by default", () => {
    expect(action.retryable).toBe(true);
  });

  it("should have default priority", () => {
    expect(action.priority).toBe(0);
  });
});
