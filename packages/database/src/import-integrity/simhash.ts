/** Title SimHashes are unsigned 32-bit values stored as binary strings. */
export const SIMHASH_BITS = 32;
const BAND_COUNT = 4;
const BAND_BITS = SIMHASH_BITS / BAND_COUNT;

/**
 * Left-pads a binary SimHash to 32 characters. Hashes stored before padding lost their leading zeros, so they never compared with full-length ones.
 *
 * @example
 * padSimHash("101") // "00000000000000000000000000000101"
 */
export function padSimHash(hash: string): string {
  return hash.padStart(SIMHASH_BITS, "0");
}

/**
 * Splits a SimHash into four 8-bit bands tagged with their position. Two hashes within Hamming distance 3 differ in at most three bands, so they always share one, which makes the GIN-indexed band column a complete candidate filter.
 *
 * @example
 * simHashBands("0000000111111111" + "0".repeat(16)) // ["0:01", "1:ff", "2:00", "3:00"]
 */
export function simHashBands(hash: string): string[] {
  if (!hash) return [];
  const padded = padSimHash(hash);
  const bands: string[] = [];
  for (let band = 0; band < BAND_COUNT; band++) {
    const bits = padded.slice(band * BAND_BITS, (band + 1) * BAND_BITS);
    const hex = Number.parseInt(bits, 2).toString(16).padStart(2, "0");
    bands.push(`${band}:${hex}`);
  }
  return bands;
}

/**
 * Number of differing bits between two SimHashes, after padding both.
 *
 * @example
 * simHashDistance("1", "11") // 1
 */
export function simHashDistance(first: string, second: string): number {
  if (!first || !second) return Number.MAX_SAFE_INTEGER;
  const a = padSimHash(first);
  const b = padSimHash(second);
  if (a.length !== b.length) return Number.MAX_SAFE_INTEGER;
  let distance = 0;
  for (let index = 0; index < a.length; index++) {
    if (a[index] !== b[index]) distance++;
  }
  return distance;
}

/**
 * Similarity between 0 and 1 from the Hamming distance of two SimHashes.
 *
 * @example
 * simHashSimilarity("0", "1") // 0.96875 (one bit of 32)
 */
export function simHashSimilarity(first: string, second: string): number {
  const distance = simHashDistance(first, second);
  if (distance === Number.MAX_SAFE_INTEGER) return 0;
  return 1 - distance / SIMHASH_BITS;
}
