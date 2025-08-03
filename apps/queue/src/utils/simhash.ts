import { SimHash } from "simhash-js";

/**
 * Utility functions for SimHash-based similarity comparison
 */

/**
 * Generate a SimHash for a given text
 * @param text The text to generate a SimHash for
 * @returns The SimHash as a string (binary representation)
 */
export function generateSimHash(text: string): string {
  if (!text || text.trim().length === 0) {
    return "";
  }

  const simhash = new SimHash();
  const hashNumber = simhash.hash(text.trim().toLowerCase());
  return hashNumber.toString(2); // Convert to binary string
}

/**
 * Calculate Hamming distance between two SimHashes
 * @param hash1 First SimHash
 * @param hash2 Second SimHash
 * @returns Hamming distance (number of different bits)
 */
export function calculateHammingDistance(hash1: string, hash2: string): number {
  if (!hash1 || !hash2 || hash1.length !== hash2.length) {
    return Number.MAX_SAFE_INTEGER; // Return max distance for invalid hashes
  }

  let distance = 0;
  for (let i = 0; i < hash1.length; i++) {
    if (hash1[i] !== hash2[i]) {
      distance++;
    }
  }
  return distance;
}

/**
 * Calculate similarity score based on Hamming distance
 * @param hash1 First SimHash
 * @param hash2 Second SimHash
 * @returns Similarity score between 0 and 1 (1 = identical, 0 = completely different)
 */
export function calculateSimilarityScore(hash1: string, hash2: string): number {
  const hammingDistance = calculateHammingDistance(hash1, hash2);
  const maxDistance = hash1.length; // Maximum possible Hamming distance

  if (maxDistance === 0) {
    return 1; // Both hashes are empty, consider them identical
  }

  return 1 - hammingDistance / maxDistance;
}

/**
 * Check if two SimHashes are similar based on a threshold
 * @param hash1 First SimHash
 * @param hash2 Second SimHash
 * @param threshold Minimum similarity score (0-1) to consider hashes similar
 * @returns True if hashes are similar enough
 */
export function areSimHashesSimilar(
  hash1: string,
  hash2: string,
  threshold: number = 0.8
): boolean {
  const similarity = calculateSimilarityScore(hash1, hash2);
  return similarity >= threshold;
}

/**
 * Generate SimHash for a note title
 * @param title The note title
 * @returns The SimHash as a string
 */
export function generateTitleSimHash(title: string | null): string {
  if (!title || title.trim().length === 0) {
    return "";
  }

  return generateSimHash(title);
}

/**
 * Calculate Jaccard similarity between two sets
 * @param set1 First set
 * @param set2 Second set
 * @returns Jaccard similarity score between 0 and 1
 */
export function calculateJaccardSimilarity<T>(
  set1: Set<T>,
  set2: Set<T>
): number {
  if (set1.size === 0 && set2.size === 0) {
    return 1; // Both sets are empty, consider them identical
  }

  const intersection = new Set<T>();
  for (const item of set1) {
    if (set2.has(item)) {
      intersection.add(item);
    }
  }

  const union = new Set<T>([...set1, ...set2]);

  return intersection.size / union.size;
}

/**
 * Calculate ingredient similarity using Jaccard similarity
 * @param ingredients1 First list of ingredients
 * @param ingredients2 Second list of ingredients
 * @returns Similarity score between 0 and 1
 */
export function calculateIngredientSimilarity(
  ingredients1: string[],
  ingredients2: string[]
): number {
  const set1 = new Set(ingredients1.map((ing) => ing.toLowerCase().trim()));
  const set2 = new Set(ingredients2.map((ing) => ing.toLowerCase().trim()));

  return calculateJaccardSimilarity(set1, set2);
}
