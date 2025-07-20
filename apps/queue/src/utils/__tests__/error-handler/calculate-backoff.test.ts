import { describe, it, expect } from "vitest";
import { ErrorHandler } from "../../error-handler";

describe("ErrorHandler.calculateBackoff", () => {
  describe("Default Configuration", () => {
    it("should return base backoff for first retry", () => {
      const result = ErrorHandler.calculateBackoff(0);
      expect(result).toBe(1000); // 1000ms base
    });

    it("should calculate exponential backoff for second retry", () => {
      const result = ErrorHandler.calculateBackoff(1);
      expect(result).toBe(2000); // 1000 * 2^1
    });

    it("should calculate exponential backoff for third retry", () => {
      const result = ErrorHandler.calculateBackoff(2);
      expect(result).toBe(4000); // 1000 * 2^2
    });

    it("should calculate exponential backoff for fourth retry", () => {
      const result = ErrorHandler.calculateBackoff(3);
      expect(result).toBe(8000); // 1000 * 2^3
    });
  });

  describe("Custom Configuration", () => {
    it("should use custom base backoff", () => {
      const result = ErrorHandler.calculateBackoff(0, { backoffMs: 500 });
      expect(result).toBe(500);
    });

    it("should use custom multiplier", () => {
      const result = ErrorHandler.calculateBackoff(2, { backoffMultiplier: 3 });
      expect(result).toBe(9000); // 1000 * 3^2
    });

    it("should use custom max backoff", () => {
      const result = ErrorHandler.calculateBackoff(10, { maxBackoffMs: 5000 });
      expect(result).toBe(5000); // Capped at max
    });

    it("should combine custom base and multiplier", () => {
      const result = ErrorHandler.calculateBackoff(2, {
        backoffMs: 200,
        backoffMultiplier: 3,
      });
      expect(result).toBe(1800); // 200 * 3^2
    });
  });

  describe("Max Backoff Capping", () => {
    it("should cap at max backoff when calculation exceeds it", () => {
      const result = ErrorHandler.calculateBackoff(10);
      expect(result).toBe(30000); // Default max backoff
    });

    it("should cap at custom max backoff", () => {
      const result = ErrorHandler.calculateBackoff(5, { maxBackoffMs: 10000 });
      expect(result).toBe(10000);
    });

    it("should not cap when calculation is below max", () => {
      const result = ErrorHandler.calculateBackoff(2, { maxBackoffMs: 10000 });
      expect(result).toBe(4000); // 1000 * 2^2 = 4000, below max
    });
  });

  describe("Edge Cases", () => {
    it("should handle zero retry count", () => {
      const result = ErrorHandler.calculateBackoff(0);
      expect(result).toBe(1000);
    });

    it("should handle negative retry count", () => {
      const result = ErrorHandler.calculateBackoff(-1);
      expect(result).toBe(500); // 1000 * 2^(-1) = 500
    });

    it("should handle very high retry count", () => {
      const result = ErrorHandler.calculateBackoff(100);
      expect(result).toBe(30000); // Capped at max
    });

    it("should handle zero base backoff", () => {
      const result = ErrorHandler.calculateBackoff(2, { backoffMs: 0 });
      expect(result).toBe(0);
    });

    it("should handle zero multiplier", () => {
      const result = ErrorHandler.calculateBackoff(2, { backoffMultiplier: 0 });
      expect(result).toBe(0);
    });

    it("should handle negative multiplier", () => {
      const result = ErrorHandler.calculateBackoff(2, {
        backoffMultiplier: -1,
      });
      expect(result).toBe(1000); // 1000 * (-1)^2 = 1000
    });

    it("should handle zero max backoff", () => {
      const result = ErrorHandler.calculateBackoff(2, { maxBackoffMs: 0 });
      expect(result).toBe(0);
    });
  });

  describe("Partial Configuration", () => {
    it("should use default values for missing config properties", () => {
      const result = ErrorHandler.calculateBackoff(2, { backoffMs: 500 });
      expect(result).toBe(2000); // 500 * 2^2 (uses default multiplier)
    });

    it("should override only specified properties", () => {
      const result = ErrorHandler.calculateBackoff(2, {
        backoffMs: 500,
        backoffMultiplier: 3,
      });
      expect(result).toBe(4500); // 500 * 3^2 (uses default max backoff)
    });

    it("should handle empty config object", () => {
      const result = ErrorHandler.calculateBackoff(2, {});
      expect(result).toBe(4000); // Uses all defaults
    });
  });

  describe("Mathematical Accuracy", () => {
    it("should calculate correct exponential values", () => {
      const config = { backoffMs: 100, backoffMultiplier: 2 };

      expect(ErrorHandler.calculateBackoff(0, config)).toBe(100); // 100 * 2^0
      expect(ErrorHandler.calculateBackoff(1, config)).toBe(200); // 100 * 2^1
      expect(ErrorHandler.calculateBackoff(2, config)).toBe(400); // 100 * 2^2
      expect(ErrorHandler.calculateBackoff(3, config)).toBe(800); // 100 * 2^3
      expect(ErrorHandler.calculateBackoff(4, config)).toBe(1600); // 100 * 2^4
    });

    it("should handle non-integer multipliers", () => {
      const result = ErrorHandler.calculateBackoff(2, {
        backoffMultiplier: 1.5,
      });
      expect(result).toBe(2250); // 1000 * 1.5^2
    });

    it("should handle very small multipliers", () => {
      const result = ErrorHandler.calculateBackoff(2, {
        backoffMultiplier: 0.5,
      });
      expect(result).toBe(250); // 1000 * 0.5^2
    });
  });
});
