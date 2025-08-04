import { describe, expect, it } from "vitest";

import { buildIngredientDependencies } from "../../ingredient/dependencies";
import type {
  IngredientJobData,
  IngredientWorkerDependencies,
} from "../../ingredient/dependencies";
import { createIngredientWorker } from "../../ingredient/worker";

describe("Ingredient Index Exports", () => {
  describe("Type exports", () => {
    it("should allow importing IngredientWorkerDependencies type", () => {
      // This is a compile-time check, so we just verify the import works
      const importedType: IngredientWorkerDependencies = {
        logger: {} as IngredientWorkerDependencies["logger"],
        services: {
          parseIngredient: async () => ({}) as IngredientJobData,
          saveIngredient: async () => ({}) as IngredientJobData,
        },
      };

      expect(importedType).toBeDefined();
    });

    it("should allow importing IngredientJobData type", () => {
      // This is a compile-time check, so we just verify the import works
      const importedType: IngredientJobData = {
        noteId: "test-note-id",
        ingredientReference: "1 cup flour",
        lineIndex: 0,
        parseStatus: "PENDING" as const,
        isActive: true,
      };

      expect(importedType).toBeDefined();
    });
  });

  describe("Function exports", () => {
    it("should export createIngredientWorker function", () => {
      expect(createIngredientWorker).toBeDefined();
      expect(typeof createIngredientWorker).toBe("function");
    });

    it("should export buildIngredientDependencies function", () => {
      expect(buildIngredientDependencies).toBeDefined();
      expect(typeof buildIngredientDependencies).toBe("function");
    });
  });
});
