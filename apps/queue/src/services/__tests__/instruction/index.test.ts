import { describe, expect, it } from "vitest";

import { registerInstructionActions } from "../../instruction";

describe("instruction index", () => {
  it("should export registerInstructionActions", () => {
    expect(registerInstructionActions).toBeDefined();
    expect(typeof registerInstructionActions).toBe("function");
  });

  it("should have correct function signature", () => {
    expect(registerInstructionActions.length).toBe(1);
  });
});
