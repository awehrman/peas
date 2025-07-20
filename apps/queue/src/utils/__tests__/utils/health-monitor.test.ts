import { describe, it, expect } from "vitest";
import * as Utils from "../../utils";

describe("utils/index HealthMonitor exports", () => {
  it("should export HealthMonitor class", () => {
    expect(Utils).toHaveProperty("HealthMonitor");
    expect(Utils.HealthMonitor).toBeDefined();
    expect(typeof Utils.HealthMonitor).toBe("function");
  });

  it("should export HealthMonitor as a constructor", () => {
    expect(Utils.HealthMonitor).toBeDefined();
    expect(typeof Utils.HealthMonitor).toBe("function");
  });

  it("should have getInstance method", () => {
    expect(Utils.HealthMonitor).toHaveProperty("getInstance");
    expect(typeof Utils.HealthMonitor.getInstance).toBe("function");
  });

  it("should have HealthMonitor in the exports", () => {
    expect(Utils).toHaveProperty("HealthMonitor");
  });
});
