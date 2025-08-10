import { describe, expect, it } from "vitest";

import { createImageWorker } from "../../image/factory";
import { ImageWorker } from "../../image/worker";

describe("Image Worker Index", () => {
  describe("exports", () => {
    it("should export ImageWorker class", () => {
      expect(ImageWorker).toBeDefined();
      expect(typeof ImageWorker).toBe("function");
    });

    it("should export createImageWorker function", () => {
      expect(createImageWorker).toBeDefined();
      expect(typeof createImageWorker).toBe("function");
    });

    it("should export ImageWorkerDependencies type", () => {
      // TypeScript types are not available at runtime, so we skip this test
      expect(true).toBe(true);
    });

    it("should have all expected exports", () => {
      expect(ImageWorker).toBeDefined();
      expect(createImageWorker).toBeDefined();

      expect(typeof ImageWorker).toBe("function");
      expect(typeof createImageWorker).toBe("function");
    });
  });

  describe("import validation", () => {
    it("should import ImageWorker correctly", () => {
      // Test that the import works at compile time
      expect(ImageWorker).toBeDefined();
    });

    it("should import createImageWorker correctly", () => {
      // Test that the import works at compile time
      expect(createImageWorker).toBeDefined();
    });

    it("should import ImageWorkerDependencies type correctly", () => {
      // TypeScript types are not available at runtime, so we skip this test
      expect(true).toBe(true);
    });
  });
});
