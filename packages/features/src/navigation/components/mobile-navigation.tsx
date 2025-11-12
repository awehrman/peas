"use client";

import { NavItem } from "./nav-item";

import { useCallback, useMemo } from "react";

import { cn, NavigationMenu, NavigationMenuItem, NavigationMenuList } from "@peas/components";
import { LogOut } from "lucide-react";

import { NAVIGATION_CONSTANTS } from "../config/constants";
import { NavigationProvider, useNavigation } from "../contexts/NavigationContext";
import { NavigationToggle } from "./navigation-toggle";
import { PureNavigationProps } from "../types/navigation";

function MobileSidebarNavigation({
  navigationItems,
  LinkComponent,
  pathname,
  signOut,
}: PureNavigationProps) {
  const { isExpanded, setIsExpanded } = useNavigation();

  // Memoize the toggle button positioning for mobile layout
  const toggleButtonStyle = useMemo(
    () => ({
      position: "absolute" as const,
      right: `${10 + NAVIGATION_CONSTANTS.TOGGLE_VERTICAL_OFFSET}px`, // 10px from right edge
      top: "8px", // Always at top for mobile
    }),
    []
  );

  const sidebarHeightClass = isExpanded
    ? NAVIGATION_CONSTANTS.MOBILE_EXPANDED_HEIGHT
    : NAVIGATION_CONSTANTS.MOBILE_COLLAPSED_HEIGHT;

  const toggleAriaLabel = isExpanded ? "Collapse navigation" : "Expand navigation";

  // Memoize the sign out form submission handler
  const handleSignOutSubmit = useCallback(() => {
    setIsExpanded(false);
  }, [setIsExpanded]);

  // Memoize the toggle button change handler
  const handleToggleChange = useCallback(() => {
    setIsExpanded((current) => !current);
  }, [setIsExpanded]);

  return (
    <aside
      className={cn(
        "bg-navigation border-b border-border fixed top-0 left-0 right-0 z-50 transition-all duration-300",
        sidebarHeightClass
      )}
    >
      {/* Custom mouse-positioned toggle button */}
      <NavigationToggle
        ariaLabel={toggleAriaLabel}
        isExpanded={isExpanded}
        onToggleChange={handleToggleChange}
        style={toggleButtonStyle}
      />

      {/* Navigation content */}
      <div className={cn("h-full flex flex-col", isExpanded ? "pt-4" : "")}>
        {isExpanded ? (
          // Expanded state - use NavigationMenu
          <NavigationMenu
            orientation="vertical"
            className="w-full h-full flex flex-col"
          >
            <NavigationMenuList className="flex-col space-y-1 w-full flex-1">
              {navigationItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <NavigationMenuItem key={item.href} className="w-full">
                    <NavItem
                      name={item.name}
                      href={item.href}
                      icon={item.icon}
                      LinkComponent={LinkComponent}
                      className={cn(
                        "flex items-center gap-3 w-full p-3 rounded-md transition-colors font-normal",
                        isActive
                          ? "!text-primary-500"
                          : "text-navigation-foreground hover:!text-primary-500"
                      )}
                    />
                  </NavigationMenuItem>
                );
              })}
              <NavigationMenuItem className="w-full mt-auto">
                <form
                  action={signOut}
                  className="flex gap-2 items-center w-full p-3 rounded-md transition-colors font-normal text-navigation-foreground hover:bg-accent hover:text-primary-500"
                  onSubmit={handleSignOutSubmit}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <button type="submit">Sign Out</button>
                </form>
              </NavigationMenuItem>
            </NavigationMenuList>
          </NavigationMenu>
        ) : (
          // Collapsed state - only show the toggle button
          <div className="h-full flex items-center justify-center">
            {/* Empty collapsed state - toggle button handles everything */}
          </div>
        )}
      </div>
    </aside>
  );
}

export function MobileNavigation(props: PureNavigationProps) {
  return (
    <NavigationProvider>
      <MobileSidebarNavigation {...props} />
    </NavigationProvider>
  );
}
