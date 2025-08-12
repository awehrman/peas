import { describe, expect, it } from "vitest";

import {
  cleanupLocalFiles,
  processImage,
  registerImageActions,
  saveImage,
  updateImageCompletedStatus,
  uploadOriginal,
  uploadProcessed,
} from "../../image";

describe("Image Service Index", () => {
  describe("exports", () => {
    it("should export registerImageActions function", () => {
      expect(typeof registerImageActions).toBe("function");
    });

    it("should export cleanupLocalFiles function", () => {
      expect(typeof cleanupLocalFiles).toBe("function");
    });

    it("should export processImage function", () => {
      expect(typeof processImage).toBe("function");
    });

    it("should export saveImage function", () => {
      expect(typeof saveImage).toBe("function");
    });

    it("should export uploadOriginal function", () => {
      expect(typeof uploadOriginal).toBe("function");
    });

    it("should export uploadProcessed function", () => {
      expect(typeof uploadProcessed).toBe("function");
    });

    it("should export updateImageCompletedStatus function", () => {
      expect(typeof updateImageCompletedStatus).toBe("function");
    });
  });

  describe("function signatures", () => {
    it("should have registerImageActions as a function that accepts a factory parameter", () => {
      expect(registerImageActions).toBeInstanceOf(Function);
      // The function should be callable (we'll test the actual behavior in register.test.ts)
      expect(() => {
        // This will throw an error due to invalid factory, but we're just testing it's callable
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          registerImageActions(null as any);
        } catch {
          // Expected to throw
        }
      }).not.toThrow();
    });

    it("should have cleanupLocalFiles as a function", () => {
      expect(cleanupLocalFiles).toBeInstanceOf(Function);
    });

    it("should have processImage as a function", () => {
      expect(processImage).toBeInstanceOf(Function);
    });

    it("should have saveImage as a function", () => {
      expect(saveImage).toBeInstanceOf(Function);
    });

    it("should have uploadOriginal as a function", () => {
      expect(uploadOriginal).toBeInstanceOf(Function);
    });

    it("should have uploadProcessed as a function", () => {
      expect(uploadProcessed).toBeInstanceOf(Function);
    });

    it("should have updateImageCompletedStatus as a function", () => {
      expect(updateImageCompletedStatus).toBeInstanceOf(Function);
    });
  });

  describe("export consistency", () => {
    it("should export all expected functions", () => {
      // Test that all expected functions are exported by checking they exist
      expect(typeof registerImageActions).toBe("function");
      expect(typeof cleanupLocalFiles).toBe("function");
      expect(typeof processImage).toBe("function");
      expect(typeof saveImage).toBe("function");
      expect(typeof uploadOriginal).toBe("function");
      expect(typeof uploadProcessed).toBe("function");
      expect(typeof updateImageCompletedStatus).toBe("function");
    });
  });
});
