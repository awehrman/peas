import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  mockValidateJobData,
  mockHealthMonitor,
} from "../../utils/worker-test-utils";
import { TestErrorHandler } from "./types";

describe("notes/validation", () => {
  let ErrorHandler: TestErrorHandler;
  let HealthMonitor: { getInstance: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    ErrorHandler = {
      validateJobData: mockValidateJobData,
      createJobError: vi.fn(),
      logError: vi.fn(),
      withErrorHandling: vi.fn(),
      shouldRetry: vi.fn(),
      calculateBackoff: vi.fn(),
      classifyError: vi.fn(),
    };
    HealthMonitor = { getInstance: vi.fn(() => mockHealthMonitor) };
    vi.clearAllMocks();
  });

  describe("validateNoteJobData", () => {
    it("returns null for valid data", async () => {
      mockValidateJobData.mockReturnValue(null);
      const { validateNoteJobData } = await import(
        "../../../workers/notes/validation"
      );

      const result = validateNoteJobData(
        { content: "ok" },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ErrorHandler as any
      );
      expect(result).toBeNull();
      expect(mockValidateJobData).toHaveBeenCalledWith({ content: "ok" }, [
        "content",
      ]);
    });
    it("returns error for invalid data", async () => {
      const error = { message: "Missing content" };
      mockValidateJobData.mockReturnValue(error);
      const { validateNoteJobData } = await import(
        "../../../workers/notes/validation"
      );
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = validateNoteJobData({}, ErrorHandler as any);
      expect(result).toBe(error);
      expect(mockValidateJobData).toHaveBeenCalledWith({}, ["content"]);
    });
  });

  describe("checkServiceHealth", () => {
    it("returns true if healthy", async () => {
      mockHealthMonitor.isHealthy.mockResolvedValue(true);
      const { checkServiceHealth } = await import(
        "../../../workers/notes/validation"
      );
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await checkServiceHealth(HealthMonitor as any);
      expect(result).toBe(true);
      expect(HealthMonitor.getInstance).toHaveBeenCalled();
      expect(mockHealthMonitor.isHealthy).toHaveBeenCalled();
    });
    it("returns false if unhealthy", async () => {
      mockHealthMonitor.isHealthy.mockResolvedValue(false);
      const { checkServiceHealth } = await import(
        "../../../workers/notes/validation"
      );
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await checkServiceHealth(HealthMonitor as any);
      expect(result).toBe(false);
    });
  });
});
