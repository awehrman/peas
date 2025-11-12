import type { ComponentType } from "react";

import type { NavigationItem, NavigationLinkComponentProps } from "../types/navigation";
import { NavigationMenuItem, cn } from "@peas/components";

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
    const isActive = pathname === item.href;
    return (
      <NavigationMenuItem key={item.href} className="w-full">
        <NavItem
          name={item.name}
          href={item.href}
          icon={item.icon}
          LinkComponent={LinkComponent}
          className={cn(
            "flex items-center gap-3 w-full p-3 rounded-md font-normal transition-colors duration-200",
            isActive
              ? "!text-primary-500"
              : "text-navigation-foreground hover:!text-primary-500"
          )}
          style={isActive ? { color: "oklch(60% 0.0900 127.79)" } : undefined}
        />
      </NavigationMenuItem>
    );
  });
}

