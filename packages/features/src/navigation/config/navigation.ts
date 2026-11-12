import {
  Carrot,
  CloudDownload,
  CookingPot,
  Home,
  StickyNote,
  Workflow,
} from "lucide-react";

import { NavigationItem } from "../types/navigation";

import { NAVIGATION_CONSTANTS } from "./constants";

export const navigationItems: NavigationItem[] = [
  { name: "Dashboard", href: "/", icon: Home },
  { name: "Import", href: "/import", icon: CloudDownload },
  { name: "Ingredients", href: "/ingredients", icon: Carrot },
  { name: "Recipes", href: "/recipes", icon: CookingPot },
  { name: "Notes", href: "/notes", icon: StickyNote },
  { name: "Parser", href: "/parser", icon: Workflow, adminOnly: true },
];

export function getNavigationItems(isAdmin: boolean): NavigationItem[] {
  return navigationItems.filter((item) => isAdmin || !item.adminOnly);
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
    isNavigationItemActive(pathname, item.href)
  );
  if (activeIndex < 0) return NAVIGATION_CONSTANTS.DEFAULT_MOUSE_Y;

  return (
    listTop +
    activeIndex * NAVIGATION_CONSTANTS.NAV_ROW_HEIGHT +
    NAVIGATION_CONSTANTS.NAV_ROW_HEIGHT / 2
  );
}
