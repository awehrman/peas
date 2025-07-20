import { describe, it, expect } from "vitest";
import * as Utils from "../../utils";

describe("utils/index utility functions", () => {
  it("should export formatLogMessage function", () => {
    expect(Utils).toHaveProperty("formatLogMessage");
    expect(typeof Utils.formatLogMessage).toBe("function");
  });

  it("should export createJobOptions function", () => {
    expect(Utils).toHaveProperty("createJobOptions");
    expect(typeof Utils.createJobOptions).toBe("function");
  });

  it("should export validateFile function", () => {
    expect(Utils).toHaveProperty("validateFile");
    expect(typeof Utils.validateFile).toBe("function");
  });

  it("should export validateFileContent function", () => {
    expect(Utils).toHaveProperty("validateFileContent");
    expect(typeof Utils.validateFileContent).toBe("function");
  });

  it("should export getHtmlFiles function", () => {
    expect(Utils).toHaveProperty("getHtmlFiles");
    expect(typeof Utils.getHtmlFiles).toBe("function");
  });

  it("should export createQueueStatusResponse function", () => {
    expect(Utils).toHaveProperty("createQueueStatusResponse");
    expect(typeof Utils.createQueueStatusResponse).toBe("function");
  });

  it("should export measureExecutionTime function", () => {
    expect(Utils).toHaveProperty("measureExecutionTime");
    expect(typeof Utils.measureExecutionTime).toBe("function");
  });

  it("should export deepClone function", () => {
    expect(Utils).toHaveProperty("deepClone");
    expect(typeof Utils.deepClone).toBe("function");
  });

  it("should export generateUuid function", () => {
    expect(Utils).toHaveProperty("generateUuid");
    expect(typeof Utils.generateUuid).toBe("function");
  });

  it("should export truncateString function", () => {
    expect(Utils).toHaveProperty("truncateString");
    expect(typeof Utils.truncateString).toBe("function");
  });

  it("should export sleep function", () => {
    expect(Utils).toHaveProperty("sleep");
    expect(typeof Utils.sleep).toBe("function");
  });
});
