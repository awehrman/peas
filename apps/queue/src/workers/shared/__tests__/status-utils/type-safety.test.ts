import { describe, it, expect } from "vitest";
import { StatusUtils } from "../../status-utils";

describe("StatusUtils - Type Safety", () => {
  it("should return proper StatusEvent type for all methods", () => {
    const processingResult = StatusUtils.createProcessingStatus({
      importId: "test",
      message: "test",
    });

    const completionResult = StatusUtils.createCompletionStatus({
      importId: "test",
      message: "test",
    });

    const progressResult = StatusUtils.createProgressStatus({
      importId: "test",
      current: 1,
      total: 2,
      itemType: "test",
      context: "test",
    });

    const errorResult = StatusUtils.createErrorStatus({
      importId: "test",
      message: "test",
    });

    // Verify all results have the expected StatusEvent structure
    const expectedKeys = ["importId", "status", "message"];

    expectedKeys.forEach((key) => {
      expect(processingResult).toHaveProperty(key);
      expect(completionResult).toHaveProperty(key);
      expect(progressResult).toHaveProperty(key);
      expect(errorResult).toHaveProperty(key);
    });

    // Verify status values are correct
    expect(processingResult.status).toBe("PROCESSING");
    expect(completionResult.status).toBe("COMPLETED");
    expect(progressResult.status).toBe("PROCESSING"); // Not complete yet
    expect(errorResult.status).toBe("FAILED");
  });
});
