import { describe, it, expect } from "vitest";
import * as Utils from "../../utils";

describe("utils/index validateJobData exports", () => {
  it("should export validateJobData function", () => {
    expect(Utils).toHaveProperty("validateJobData");
    expect(typeof Utils.validateJobData).toBe("function");
  });

  it("should have validateJobData in the exports", () => {
    expect(Utils).toHaveProperty("validateJobData");
  });

  it("should export validateJobData as a function", () => {
    expect(typeof Utils.validateJobData).toBe("function");
  });
});
