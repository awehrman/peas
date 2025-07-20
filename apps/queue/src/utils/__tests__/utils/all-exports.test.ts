import { describe, it, expect } from "vitest";
import * as Utils from "../../utils";

describe("utils/index all exports", () => {
  it("should export all expected modules", () => {
    // Test that all expected exports are available
    expect(Utils).toHaveProperty("ErrorHandler");
    expect(Utils).toHaveProperty("QueueError");
    expect(Utils).toHaveProperty("HealthMonitor");
    expect(Utils).toHaveProperty("validateJobData");
  });

  it("should export all utility functions", () => {
    expect(Utils).toHaveProperty("formatLogMessage");
    expect(Utils).toHaveProperty("createJobOptions");
    expect(Utils).toHaveProperty("validateFile");
    expect(Utils).toHaveProperty("validateFileContent");
    expect(Utils).toHaveProperty("getHtmlFiles");
    expect(Utils).toHaveProperty("createQueueStatusResponse");
    expect(Utils).toHaveProperty("measureExecutionTime");
    expect(Utils).toHaveProperty("deepClone");
    expect(Utils).toHaveProperty("generateUuid");
    expect(Utils).toHaveProperty("truncateString");
    expect(Utils).toHaveProperty("sleep");
  });

  it("should export all expected modules with correct types", () => {
    expect(Utils.ErrorHandler).toBeDefined();
    expect(Utils.QueueError).toBeDefined();
    expect(Utils.HealthMonitor).toBeDefined();
    expect(Utils.validateJobData).toBeDefined();
  });

  it("should export all utility functions with correct types", () => {
    expect(typeof Utils.formatLogMessage).toBe("function");
    expect(typeof Utils.createJobOptions).toBe("function");
    expect(typeof Utils.validateFile).toBe("function");
    expect(typeof Utils.validateFileContent).toBe("function");
    expect(typeof Utils.getHtmlFiles).toBe("function");
    expect(typeof Utils.createQueueStatusResponse).toBe("function");
    expect(typeof Utils.measureExecutionTime).toBe("function");
    expect(typeof Utils.deepClone).toBe("function");
    expect(typeof Utils.generateUuid).toBe("function");
    expect(typeof Utils.truncateString).toBe("function");
    expect(typeof Utils.sleep).toBe("function");
  });
});
