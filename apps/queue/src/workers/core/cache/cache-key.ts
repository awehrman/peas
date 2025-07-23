// Cache key generation utility
export function createCacheKey(
  ...parts: (string | number | undefined)[]
): string {
  return parts.filter(Boolean).join(":");
}
