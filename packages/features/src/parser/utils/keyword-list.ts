/**
 * Wraps a bare keyword as a case-insensitive Peggy literal (`'cup'i`).
 * Entries that already start with a quote or `$(` are kept as written.
 */
export function formatKeyword(value: string): string {
  const trimmed = value.trim();
  if (/^['"$]/.test(trimmed)) return trimmed;
  return `'${trimmed.replace(/\\/g, "\\\\").replace(/'/g, "\\'")}'i`;
}

/**
 * Adds comma- or slash-separated keywords to a list, removing duplicates
 * and sorting longest first so Peggy tries longer matches before their
 * prefixes ("tablespoon" before "table").
 */
export function formatKeywordList(input: string, list: string[]): string[] {
  const separator = input.includes(",") ? "," : "/";
  const additions = input
    .split(separator)
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map(formatKeyword);

  return sortByLength([...new Set([...list, ...additions])]);
}

export function sortByLength(list: string[]): string[] {
  return [...list].sort((a, b) => b.length - a.length || a.localeCompare(b));
}
