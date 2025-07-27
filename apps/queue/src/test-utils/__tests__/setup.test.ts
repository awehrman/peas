import { beforeEach, describe, expect, it, vi } from "vitest";

import { verifyTestSetup } from "../setup";

describe("setup", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("global setup", () => {
    it("should have global test environment configured", () => {
      expect(global).toBeDefined();
      expect(process.env.NODE_ENV).toBe("test");
    });

    it("should have test environment variables set", () => {
      expect(process.env).toBeDefined();
    });

    it("should verify test setup function", () => {
      expect(verifyTestSetup()).toBe(true);
    });
  });

  describe("mock availability", () => {
    it("should have mocks available for testing", () => {
      // Test that we can create mocks
      const mockFn = vi.fn();
      expect(vi.isMockFunction(mockFn)).toBe(true);
    });
  });
});
