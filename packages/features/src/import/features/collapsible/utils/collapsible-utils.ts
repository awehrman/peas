/**
 * Calculate the optimal transition duration based on content height
 */
export function calculateTransitionDuration(contentHeight: number): number {
  // Base duration is 300ms, scale with content height for larger content
  const baseDuration = 300;
  const heightFactor = Math.min(contentHeight / 500, 2); // Cap at 2x
  return Math.round(baseDuration * heightFactor);
}

/**
 * Check if an element should be expanded by default
 */
export function shouldExpandByDefault(
  index: number,
  totalItems: number,
  defaultExpandedFirst: boolean = false,
  maxExpandedItems: number = 1
): boolean {
  if (defaultExpandedFirst && index === 0) {
    return true;
  }
  
  if (maxExpandedItems > 0 && index < maxExpandedItems) {
    return true;
  }
  
  return false;
}

/**
 * Get the next item to expand in a single-expand group
 */
export function getNextExpandedItem(
  currentExpandedId: string | null,
  items: Array<{ id: string }>,
  direction: 'next' | 'prev' = 'next'
): string | null {
  if (!currentExpandedId) {
    return items.length > 0 ? items[0]?.id ?? null : null;
  }
  
  const currentIndex = items.findIndex(item => item.id === currentExpandedId);
  if (currentIndex === -1) {
    return items.length > 0 ? items[0]?.id ?? null : null;
  }
  
  if (direction === 'next') {
    const nextIndex = (currentIndex + 1) % items.length;
    return items[nextIndex]?.id ?? null;
  } else {
    const prevIndex = currentIndex === 0 ? items.length - 1 : currentIndex - 1;
    return items[prevIndex]?.id ?? null;
  }
}

/**
 * Animate scroll to element when expanded
 */
export function scrollToElement(
  element: HTMLElement,
  offset: number = 0,
  behavior: ScrollBehavior = 'smooth'
): void {
  const elementTop = element.offsetTop - offset;
  window.scrollTo({
    top: elementTop,
    behavior,
  });
}

/**
 * Check if element is in viewport
 */
export function isInViewport(element: HTMLElement): boolean {
  const rect = element.getBoundingClientRect();
  return (
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
    rect.right <= (window.innerWidth || document.documentElement.clientWidth)
  );
}
