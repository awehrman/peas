import type { ComponentType } from "react";

import type { NavigationItem, NavigationLinkComponentProps } from "../types/navigation";
import { NavigationMenuItem, cn } from "@peas/components";

import { isNavigationItemActive } from "../config/navigation";

import { NavItem } from "./nav-item";

interface NavigationItemsListProps {
  navigationItems: NavigationItem[];
  LinkComponent?: ComponentType<NavigationLinkComponentProps>;
  pathname?: string;
}

export function NavigationItemsList({
  navigationItems,
  LinkComponent,
  pathname,
}: NavigationItemsListProps) {
  return navigationItems.map((item) => {
    const isActive = isNavigationItemActive(pathname, item.href);
    return (
      <NavigationMenuItem key={item.href} className="w-full">
        <NavItem
          name={item.name}
          href={item.href}
          icon={item.icon}
          LinkComponent={LinkComponent}
          className={cn(
            "group/nav-item flex items-center gap-3 w-full px-5 py-1.5 text-sm font-medium transition-colors duration-200",
            isActive
              ? "!text-primary-300 bg-white/10"
              : "text-navigation-foreground hover:!text-primary-300 hover:bg-white/5"
          )}
          iconClassName={cn(
            "shrink-0 transition-opacity duration-200",
            isActive
              ? "opacity-100"
              : "opacity-0 group-hover/nav-item:opacity-100 group-focus-visible/nav-item:opacity-100"
          )}
        />
      </NavigationMenuItem>
    );
  });
}

