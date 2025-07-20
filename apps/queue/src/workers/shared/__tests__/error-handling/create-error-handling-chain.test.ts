import { describe, it, expect } from "vitest";
import {
  createErrorHandlingChain,
  LogErrorAction,
  CaptureErrorAction,
  ErrorRecoveryAction,
} from "../../error-handling";

// ============================================================================
// createErrorHandlingChain helper
// ============================================================================

describe("createErrorHandlingChain", () => {
  it("should return a chain of LogErrorAction, CaptureErrorAction, ErrorRecoveryAction", () => {
    const chain = createErrorHandlingChain("note-123");
    expect(chain).toHaveLength(3);
    expect(chain[0]).toBeInstanceOf(LogErrorAction);
    expect(chain[1]).toBeInstanceOf(CaptureErrorAction);
    expect(chain[2]).toBeInstanceOf(ErrorRecoveryAction);
  });
});
