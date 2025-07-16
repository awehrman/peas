import { describe, it, expect } from "vitest";
import * as Services from "../index";

describe("services barrel file", () => {
  it("should export all expected modules", () => {
    expect(Services).toBeDefined();
    // Optionally check for a known export
    expect(Services.ServiceContainer).toBeDefined();
  });
});
