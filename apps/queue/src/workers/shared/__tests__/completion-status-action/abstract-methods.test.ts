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

describe("CompletionStatusAction - abstract method implementations", () => {
  let action: TestCompletionStatusAction;

  beforeEach(() => {
    vi.clearAllMocks();
    action = new TestCompletionStatusAction();
  });

  it("should implement getCompletionMessage", () => {
    const testData = { message: "Custom message" };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const message = (action as any).getCompletionMessage(testData);
    expect(message).toBe("Custom message");
  });

  it("should implement getCompletionContext", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const context = (action as any).getCompletionContext();
    expect(context).toBe("test_context");
  });

  it("should implement getImportId", () => {
    const testData = { importId: "custom-import-123" };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const importId = (action as any).getImportId(testData);
    expect(importId).toBe("custom-import-123");
  });

  it("should implement getNoteId", () => {
    const testData = { noteId: "custom-note-456" };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const noteId = (action as any).getNoteId(testData);
    expect(noteId).toBe("custom-note-456");
  });

  it("should implement getCompletionMetadata", () => {
    const testData = { metadata: { custom: "data" } };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const metadata = (action as any).getCompletionMetadata(testData);
    expect(metadata).toEqual({ custom: "data" });
  });
});
