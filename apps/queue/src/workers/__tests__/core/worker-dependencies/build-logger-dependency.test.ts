/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, expect, it, vi } from "vitest";

import type { IServiceContainer } from "../../../../services/container";
import { buildLoggerDependency } from "../../../core/worker-dependencies/build-logger-dependency";

describe("buildLoggerDependency", () => {
  describe("successful cases", () => {
    it("should return container logger when container is available", () => {
      const mockLogger = {
        log: vi.fn(),
      };

      const mockContainer = {
        logger: mockLogger,
      } as unknown as IServiceContainer;

      const result = buildLoggerDependency(mockContainer);

      expect(result).toBe(mockLogger);
    });

    it("should return logger with log method", () => {
      const mockLogger = {
        log: vi.fn(),
      };

      const mockContainer = {
        logger: mockLogger,
      } as unknown as IServiceContainer;

      const result = buildLoggerDependency(mockContainer);

      expect(result).toBeDefined();
      expect(typeof result.log).toBe("function");
    });

    it("should return the same logger instance on multiple calls", () => {
      const mockLogger = {
        log: vi.fn(),
      };

      const mockContainer = {
        logger: mockLogger,
      } as unknown as IServiceContainer;

      const result1 = buildLoggerDependency(mockContainer);
      const result2 = buildLoggerDependency(mockContainer);

      expect(result1).toBe(result2);
      expect(result1).toBe(mockLogger);
    });
  });

  describe("error cases", () => {
    it("should throw error when container is null", () => {
      expect(() => {
        buildLoggerDependency(null as any);
      }).toThrow("Container not available for logger");
    });

    it("should throw error when container is undefined", () => {
      expect(() => {
        buildLoggerDependency(undefined as any);
      }).toThrow("Container not available for logger");
    });

    it("should not throw error when container is empty object", () => {
      expect(() => {
        buildLoggerDependency({} as any);
      }).not.toThrow();
    });

    it("should not throw error when container has no logger property", () => {
      const mockContainer = {
        someOtherProperty: "value",
      } as any;

      expect(() => {
        buildLoggerDependency(mockContainer);
      }).not.toThrow();
    });

    it("should not throw error when container logger is null", () => {
      const mockContainer = {
        logger: null,
      } as any;

      expect(() => {
        buildLoggerDependency(mockContainer);
      }).not.toThrow();
    });

    it("should not throw error when container logger is undefined", () => {
      const mockContainer = {
        logger: undefined,
      } as any;

      expect(() => {
        buildLoggerDependency(mockContainer);
      }).not.toThrow();
    });
  });

  describe("edge cases", () => {
    it("should handle container with falsy values", () => {
      const falsyValues = [false, 0, "", NaN];

      falsyValues.forEach((falsyValue) => {
        expect(() => {
          buildLoggerDependency(falsyValue as any);
        }).toThrow("Container not available for logger");
      });
    });

    it("should handle container with non-object values", () => {
      const nonObjectValues = ["string", 123, true, () => {}];

      nonObjectValues.forEach((nonObjectValue) => {
        if (nonObjectValue === "") {
          expect(() => {
            buildLoggerDependency(nonObjectValue as any);
          }).toThrow("Container not available for logger");
        } else {
          expect(() => {
            buildLoggerDependency(nonObjectValue as any);
          }).not.toThrow();
        }
      });
    });
  });
});
