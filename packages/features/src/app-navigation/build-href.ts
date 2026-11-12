export type SearchParamValue = string | number | boolean | null | undefined;

/**
 * Builds `path?query` from the current params plus overrides.
 * Overrides set to null/undefined/"" remove that key.
 */
export function buildHref(
  path: string,
  current: Record<string, SearchParamValue>,
  overrides: Record<string, SearchParamValue> = {}
): string {
  const merged = { ...current, ...overrides };
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(merged)) {
    if (value === null || value === undefined || value === "") continue;
    params.set(key, String(value));
  }

  const query = params.toString();
  return query ? `${path}?${query}` : path;
}
