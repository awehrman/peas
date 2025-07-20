import { describe, it, expect } from "vitest";
import * as Utils from "../../utils";

describe("utils/index ErrorHandler exports", () => {
  it("should export ErrorHandler", () => {
    expect(Utils).toHaveProperty("ErrorHandler");
    expect(Utils.ErrorHandler).toBeDefined();
  });

  it("should export ErrorHandler with all expected methods", () => {
    expect(typeof Utils.ErrorHandler.createJobError).toBe("function");
    expect(typeof Utils.ErrorHandler.createValidationError).toBe("function");
    expect(typeof Utils.ErrorHandler.createDatabaseError).toBe("function");
    expect(typeof Utils.ErrorHandler.shouldRetry).toBe("function");
    expect(typeof Utils.ErrorHandler.calculateBackoff).toBe("function");
    expect(typeof Utils.ErrorHandler.logError).toBe("function");
    expect(typeof Utils.ErrorHandler.classifyError).toBe("function");
    expect(typeof Utils.ErrorHandler.withErrorHandling).toBe("function");
    expect(typeof Utils.ErrorHandler.validateJobData).toBe("function");
  });

  it("should export createJobError method", () => {
    expect(Utils.ErrorHandler).toHaveProperty("createJobError");
    expect(typeof Utils.ErrorHandler.createJobError).toBe("function");
  });

  it("should export createValidationError method", () => {
    expect(Utils.ErrorHandler).toHaveProperty("createValidationError");
    expect(typeof Utils.ErrorHandler.createValidationError).toBe("function");
  });

  it("should export createDatabaseError method", () => {
    expect(Utils.ErrorHandler).toHaveProperty("createDatabaseError");
    expect(typeof Utils.ErrorHandler.createDatabaseError).toBe("function");
  });

  it("should export shouldRetry method", () => {
    expect(Utils.ErrorHandler).toHaveProperty("shouldRetry");
    expect(typeof Utils.ErrorHandler.shouldRetry).toBe("function");
  });

  it("should export calculateBackoff method", () => {
    expect(Utils.ErrorHandler).toHaveProperty("calculateBackoff");
    expect(typeof Utils.ErrorHandler.calculateBackoff).toBe("function");
  });

  it("should export logError method", () => {
    expect(Utils.ErrorHandler).toHaveProperty("logError");
    expect(typeof Utils.ErrorHandler.logError).toBe("function");
  });

  it("should export classifyError method", () => {
    expect(Utils.ErrorHandler).toHaveProperty("classifyError");
    expect(typeof Utils.ErrorHandler.classifyError).toBe("function");
  });

  it("should export withErrorHandling method", () => {
    expect(Utils.ErrorHandler).toHaveProperty("withErrorHandling");
    expect(typeof Utils.ErrorHandler.withErrorHandling).toBe("function");
  });

  it("should export validateJobData method", () => {
    expect(Utils.ErrorHandler).toHaveProperty("validateJobData");
    expect(typeof Utils.ErrorHandler.validateJobData).toBe("function");
  });
});
