export type PageWindowItem = number | "ellipsis-start" | "ellipsis-end";

/**
 * Zero-based page indexes to link to: the first and last pages, the current
 * page and `radius` neighbours on each side, with ellipses marking the gaps.
 */
export function getPageWindow(
  currentPage: number,
  totalPages: number,
  radius = 1
): PageWindowItem[] {
  if (totalPages <= 0) return [];

  const start = Math.max(1, currentPage - radius);
  const end = Math.min(totalPages - 2, currentPage + radius);

  const items: PageWindowItem[] = [0];
  if (start > 1) items.push("ellipsis-start");
  for (let page = start; page <= end; page++) items.push(page);
  if (end < totalPages - 2) items.push("ellipsis-end");
  if (totalPages > 1) items.push(totalPages - 1);
  return items;
}
