import { describe, expect, it } from "vitest";

import * as ActionWrappers from "../../../core/action-wrappers";

describe("Action Wrappers Index", () => {
  describe("exports", () => {
    it("should export ErrorHandlingAction", () => {
      expect(ActionWrappers.ErrorHandlingAction).toBeDefined();
      expect(typeof ActionWrappers.ErrorHandlingAction).toBe("function");
    });

    it("should export wrapActionWithErrorHandlingOnly", () => {
      expect(ActionWrappers.wrapActionWithErrorHandlingOnly).toBeDefined();
      expect(typeof ActionWrappers.wrapActionWithErrorHandlingOnly).toBe(
        "function"
      );
    });

    it("should export wrapActionWithErrorHandlingFactory", () => {
      expect(ActionWrappers.wrapActionWithErrorHandlingFactory).toBeDefined();
      expect(typeof ActionWrappers.wrapActionWithErrorHandlingFactory).toBe(
        "function"
      );
    });

    it("should export RetryAction", () => {
      expect(ActionWrappers.RetryAction).toBeDefined();
      expect(typeof ActionWrappers.RetryAction).toBe("function");
    });

    it("should export wrapActionWithRetryAndErrorHandling", () => {
      expect(ActionWrappers.wrapActionWithRetryAndErrorHandling).toBeDefined();
      expect(typeof ActionWrappers.wrapActionWithRetryAndErrorHandling).toBe(
        "function"
      );
    });

    it("should export wrapActionWithRetryAndErrorHandlingFactory", () => {
      expect(
        ActionWrappers.wrapActionWithRetryAndErrorHandlingFactory
      ).toBeDefined();
      expect(
        typeof ActionWrappers.wrapActionWithRetryAndErrorHandlingFactory
      ).toBe("function");
    });

    it("should export createRetryWrapper", () => {
      expect(ActionWrappers.createRetryWrapper).toBeDefined();
      expect(typeof ActionWrappers.createRetryWrapper).toBe("function");
    });

    it("should export DEFAULT_RETRY_CONFIG", () => {
      expect(ActionWrappers.DEFAULT_RETRY_CONFIG).toBeDefined();
      expect(typeof ActionWrappers.DEFAULT_RETRY_CONFIG).toBe("object");
    });

    // Note: TypeScript types are not available at runtime, so we don't test them
    // RetryConfig, RetryDeps, and RetryData are TypeScript interfaces/types
  });

  describe("export structure", () => {
    it("should have all expected exports", () => {
      const expectedExports = [
        "ErrorHandlingAction",
        "wrapActionWithErrorHandlingOnly",
        "wrapActionWithErrorHandlingFactory",
        "RetryAction",
        "wrapActionWithRetryAndErrorHandling",
        "wrapActionWithRetryAndErrorHandlingFactory",
        "createRetryWrapper",
        "DEFAULT_RETRY_CONFIG",
      ];

      expectedExports.forEach((exportName) => {
        expect(ActionWrappers).toHaveProperty(exportName);
      });
    });
  });

  describe("DEFAULT_RETRY_CONFIG structure", () => {
    it("should have correct retry configuration properties", () => {
      const config = ActionWrappers.DEFAULT_RETRY_CONFIG;

      expect(config).toHaveProperty("maxRetries");
      expect(config).toHaveProperty("backoffMs");
      expect(config).toHaveProperty("backoffMultiplier");
      expect(config).toHaveProperty("maxBackoffMs");

      expect(typeof config.maxRetries).toBe("number");
      expect(typeof config.backoffMs).toBe("number");
      expect(typeof config.backoffMultiplier).toBe("number");
      expect(typeof config.maxBackoffMs).toBe("number");
    });

    it("should have reasonable default values", () => {
      const config = ActionWrappers.DEFAULT_RETRY_CONFIG;

      expect(config.maxRetries).toBeGreaterThan(0);
      expect(config.backoffMs).toBeGreaterThan(0);
      expect(config.backoffMultiplier).toBeGreaterThan(1);
      expect(config.maxBackoffMs).toBeGreaterThan(config.backoffMs);
    });
  });
});
