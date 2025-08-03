import { describe, expect, it } from "vitest";

import {
  areSimHashesSimilar,
  calculateHammingDistance,
  calculateIngredientSimilarity,
  calculateJaccardSimilarity,
  calculateSimilarityScore,
  generateSimHash,
  generateTitleSimHash,
} from "../simhash";

describe("SimHash Utilities", () => {
  describe("generateSimHash", () => {
    it("should generate SimHash for valid text", () => {
      const text = "Chocolate Chip Cookies";
      const hash = generateSimHash(text);

      expect(hash).toBeDefined();
      expect(typeof hash).toBe("string");
      expect(hash.length).toBeGreaterThan(0);
    });

    it("should return empty string for empty text", () => {
      const hash = generateSimHash("");
      expect(hash).toBe("");
    });

    it("should return empty string for whitespace-only text", () => {
      const hash = generateSimHash("   \n\t  ");
      expect(hash).toBe("");
    });

    it("should handle null and undefined", () => {
      expect(generateSimHash(null as unknown as string)).toBe("");
      expect(generateSimHash(undefined as unknown as string)).toBe("");
    });
  });

  describe("calculateHammingDistance", () => {
    it("should calculate correct Hamming distance for identical hashes", () => {
      const hash = "10101010";
      const distance = calculateHammingDistance(hash, hash);
      expect(distance).toBe(0);
    });

    it("should calculate correct Hamming distance for different hashes", () => {
      const hash1 = "10101010";
      const hash2 = "10101011";
      const distance = calculateHammingDistance(hash1, hash2);
      expect(distance).toBe(1);
    });

    it("should handle completely different hashes", () => {
      const hash1 = "00000000";
      const hash2 = "11111111";
      const distance = calculateHammingDistance(hash1, hash2);
      expect(distance).toBe(8);
    });

    it("should return max distance for invalid hashes", () => {
      const distance = calculateHammingDistance("", "10101010");
      expect(distance).toBe(Number.MAX_SAFE_INTEGER);
    });

    it("should return max distance for different length hashes", () => {
      const distance = calculateHammingDistance("1010", "10101010");
      expect(distance).toBe(Number.MAX_SAFE_INTEGER);
    });
  });

  describe("calculateSimilarityScore", () => {
    it("should return 1.0 for identical hashes", () => {
      const hash = "10101010";
      const similarity = calculateSimilarityScore(hash, hash);
      expect(similarity).toBe(1.0);
    });

    it("should return 0.0 for completely different hashes", () => {
      const hash1 = "00000000";
      const hash2 = "11111111";
      const similarity = calculateSimilarityScore(hash1, hash2);
      expect(similarity).toBe(0.0);
    });

    it("should return 0.875 for hashes with 1 bit difference", () => {
      const hash1 = "10101010";
      const hash2 = "10101011";
      const similarity = calculateSimilarityScore(hash1, hash2);
      expect(similarity).toBe(0.875); // 7/8 = 0.875
    });

    it("should return 1.0 for empty hashes", () => {
      const similarity = calculateSimilarityScore("", "");
      expect(similarity).toBe(1.0);
    });
  });

  describe("areSimHashesSimilar", () => {
    it("should return true for identical hashes", () => {
      const hash = "10101010";
      const result = areSimHashesSimilar(hash, hash);
      expect(result).toBe(true);
    });

    it("should return true for similar hashes above threshold", () => {
      const hash1 = "10101010";
      const hash2 = "10101011";
      const result = areSimHashesSimilar(hash1, hash2, 0.8);
      expect(result).toBe(true);
    });

    it("should return false for different hashes below threshold", () => {
      const hash1 = "00000000";
      const hash2 = "11111111";
      const result = areSimHashesSimilar(hash1, hash2, 0.8);
      expect(result).toBe(false);
    });
  });

  describe("generateTitleSimHash", () => {
    it("should generate SimHash for valid title", () => {
      const title = "Chocolate Chip Cookies";
      const hash = generateTitleSimHash(title);

      expect(hash).toBeDefined();
      expect(typeof hash).toBe("string");
      expect(hash.length).toBeGreaterThan(0);
    });

    it("should return empty string for null title", () => {
      const hash = generateTitleSimHash(null);
      expect(hash).toBe("");
    });

    it("should return empty string for empty title", () => {
      const hash = generateTitleSimHash("");
      expect(hash).toBe("");
    });

    it("should handle whitespace-only title", () => {
      const hash = generateTitleSimHash("   \n\t  ");
      expect(hash).toBe("");
    });
  });

  describe("calculateJaccardSimilarity", () => {
    it("should return 1.0 for identical sets", () => {
      const set1 = new Set(["a", "b", "c"]);
      const set2 = new Set(["a", "b", "c"]);
      const similarity = calculateJaccardSimilarity(set1, set2);
      expect(similarity).toBe(1.0);
    });

    it("should return 0.0 for completely different sets", () => {
      const set1 = new Set(["a", "b", "c"]);
      const set2 = new Set(["d", "e", "f"]);
      const similarity = calculateJaccardSimilarity(set1, set2);
      expect(similarity).toBe(0.0);
    });

    it("should return 0.5 for partially overlapping sets", () => {
      const set1 = new Set(["a", "b", "c"]);
      const set2 = new Set(["b", "c", "d"]);
      const similarity = calculateJaccardSimilarity(set1, set2);
      expect(similarity).toBe(0.5); // 2 intersection / 4 union = 0.5
    });

    it("should return 1.0 for empty sets", () => {
      const set1 = new Set<string>();
      const set2 = new Set<string>();
      const similarity = calculateJaccardSimilarity(set1, set2);
      expect(similarity).toBe(1.0);
    });
  });

  describe("calculateIngredientSimilarity", () => {
    it("should return 1.0 for identical ingredient lists", () => {
      const ingredients1 = ["flour", "sugar", "eggs"];
      const ingredients2 = ["flour", "sugar", "eggs"];
      const similarity = calculateIngredientSimilarity(
        ingredients1,
        ingredients2
      );
      expect(similarity).toBe(1.0);
    });

    it("should return 0.0 for completely different ingredient lists", () => {
      const ingredients1 = ["flour", "sugar", "eggs"];
      const ingredients2 = ["milk", "butter", "vanilla"];
      const similarity = calculateIngredientSimilarity(
        ingredients1,
        ingredients2
      );
      expect(similarity).toBe(0.0);
    });

    it("should return 0.5 for partially overlapping ingredient lists", () => {
      const ingredients1 = ["flour", "sugar", "eggs"];
      const ingredients2 = ["sugar", "eggs", "milk"];
      const similarity = calculateIngredientSimilarity(
        ingredients1,
        ingredients2
      );
      expect(similarity).toBe(0.5); // 2 intersection / 4 union = 0.5
    });

    it("should handle case differences", () => {
      const ingredients1 = ["Flour", "Sugar", "Eggs"];
      const ingredients2 = ["flour", "sugar", "eggs"];
      const similarity = calculateIngredientSimilarity(
        ingredients1,
        ingredients2
      );
      expect(similarity).toBe(1.0);
    });

    it("should handle whitespace differences", () => {
      const ingredients1 = [" flour ", " sugar ", " eggs "];
      const ingredients2 = ["flour", "sugar", "eggs"];
      const similarity = calculateIngredientSimilarity(
        ingredients1,
        ingredients2
      );
      expect(similarity).toBe(1.0);
    });
  });
});
