import { NAVIGATION_CONSTANTS } from "./constants";

import {
  Carrot,
  CloudDownload,
  CookingPot,
  GraduationCap,
  Home,
  StickyNote,
} from "lucide-react";

import { NavigationItem } from "../types/navigation";

export const navigationItems: NavigationItem[] = [
  { name: "Dashboard", href: "/", icon: Home },
  { name: "Import", href: "/import", icon: CloudDownload },
  { name: "Ingredients", href: "/ingredients", icon: Carrot },
  { name: "Recipes", href: "/recipes", icon: CookingPot },
  { name: "Notes", href: "/notes", icon: StickyNote },
  {
    name: "Knowledge",
    href: "/teach",
    icon: GraduationCap,
    curatorOnly: true,
    activePaths: ["/concepts", "/lexicon"],
  },
];

/**
 * The entries a viewer sees: admin-only ones for admins, curator-only ones (Knowledge) for whoever may curate food knowledge.
 *
 * @example
 * getNavigationItems({ isAdmin: false, canCurate: true }) // Dashboard, Import, Ingredients, Recipes, Notes, Knowledge
 */
export function getNavigationItems(access: {
  isAdmin: boolean;
  canCurate: boolean;
}): NavigationItem[] {
  return navigationItems.filter(
    (item) =>
      (access.isAdmin || !item.adminOnly) && (access.canCurate || !item.curatorOnly)
  );
}

/** Whether the item's own section or one of its `activePaths` contains the page. */
export function isNavigationEntryActive(
  pathname: string | undefined,
  item: Pick<NavigationItem, "href" | "activePaths">
): boolean {
  return [item.href, ...(item.activePaths ?? [])].some((href) =>
    isNavigationItemActive(pathname, href)
  );
}

export function isNavigationItemActive(
  pathname: string | undefined,
  href: string
): boolean {
  if (!pathname) return false;
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * Where the sidebar toggle's center rests when it isn't following the mouse:
 * the middle of the active page's row, or the default spot when no item is
 * active. `listTop` is where the first row starts, which moves down when
 * something sits above the list.
 */
export function getToggleRestY(
  navigationItems: NavigationItem[],
  pathname: string | undefined,
  listTop: number = NAVIGATION_CONSTANTS.NAV_LIST_TOP
): number {
  const activeIndex = navigationItems.findIndex((item) =>
    isNavigationEntryActive(pathname, item)
  );
  if (activeIndex < 0) return NAVIGATION_CONSTANTS.DEFAULT_MOUSE_Y;

  return (
    listTop +
    activeIndex * NAVIGATION_CONSTANTS.NAV_ROW_HEIGHT +
    NAVIGATION_CONSTANTS.NAV_ROW_HEIGHT / 2
  );
}
