import { describe, it, expect } from "vitest";
import * as Utils from "../../utils";

describe("utils/index QueueError exports", () => {
  it("should export QueueError class", () => {
    expect(Utils).toHaveProperty("QueueError");
    expect(Utils.QueueError).toBeDefined();
    expect(typeof Utils.QueueError).toBe("function");
  });

  it("should export QueueError as a constructor", () => {
    expect(Utils.QueueError).toBeDefined();
    expect(typeof Utils.QueueError).toBe("function");
  });

  it("should have QueueError in the exports", () => {
    expect(Utils).toHaveProperty("QueueError");
  });
});
